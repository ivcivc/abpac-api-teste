'use strict'

const Redis = use('Redis')
const Drive = use('Drive')
const Helpers = use('Helpers')
const Env = use('Env')

const ModelLancamento = use('App/Models/Lancamento')
const ModelEmailLog = use('App/Models/EmailLog')
const RateioServices = use('App/Services/Rateio')

const moment = use('moment')
const lodash = use('lodash')

const Ws = use('Ws')

const ServiceZap = use('App/Services/Zap/MyZap')

class ZapMassaController {
   constructor({ socket, request }) {
      this.socket = socket
      this.request = request
      this.topic = socket.topic
      console.log(`Back ${this.topic} connected to WS ${this.topic}`)
   }

   async onMessage(e) {
      console.log('message zap disparada')
      this.socket.emit('message', e)
   }

   async logZap(o, item) {
      console.log('gerar log ', o)
      const obj = {
         boleto_id: null,
         mensagem: '',
         response: '',
         tipo: 'zap',
         pessoa_id: null,
         status: 'falha',
      }

      if (!lodash.has(o, 'mensagem')) {
         obj.mensagem = o.message
      } else {
         obj.mensagem = o.mensagem
      }
      if (!lodash.has(o, 'response')) {
         obj.response = obj.mensagem
      } else {
         obj.response = o.response
      }
      if (!lodash.has(o, 'boleto_id')) {
         obj.boleto_id = item.boleto_id
      } else {
         obj.boleto_id = o.boleto_id
      }
      if (!lodash.has(o, 'pessoa_id')) {
         obj.pessoa_id = item.pessoa_id
      } else {
         obj.pessoa_id = o.pessoa_id
      }
      if (lodash.has(o, 'status')) {
         obj.status = o.status
      }

      if (obj.boleto_id) {
         const log = await ModelEmailLog.create(obj)
      }
   }

   async buscarLancamento(lancamento_id) {
      return new Promise(async (resolve, reject) => {
         try {
            const lancamento = await ModelLancamento.findOrFail(lancamento_id)
            await lancamento.load('pessoa')
            await lancamento.load('boletos')

            resolve(lancamento)
         } catch (error) {
            reject(error)
         }
      })
   }

   getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min
   }

   /*async onListaSelecionados() {
      const topic = Ws.getChannel('zap_massa:*').topic('zap_massa:zap_massa')

      let lista = []
      console.log('lista selecionados ', lista)
      if (lodash(this, 'listaSelecionados')) {
         lista = this.listaSelecionados
      }

      if (topic) {
         topic.broadcast('message', {
            operation: 'LISTA-SELECIONADOS-ZAP',
            data: lista,
         })
      }
   }*/

   async *dispararZapMassa(o) {
      let topic = null
      let lancamento = null

      const rateio_id = o.rateio_id
      const lista = o.lista
      let pessoa_id = null
      let json = null

      try {
         for (const key in lista) {
            if (Object.hasOwnProperty.call(lista, key)) {
               let item = null
               try {
                  item = lista[key]

                  topic = Ws.getChannel('zap_massa:*').topic(
                     'zap_massa:zap_massa'
                  )
                  if (topic) {
                     topic.broadcast('message', {
                        operation: 'enviando',
                        data: item.lancamento_id,
                     })
                  }

                  lancamento = await this.buscarLancamento(item.lancamento_id)
                  if (!lancamento) {
                     throw { message: 'Lançamento não encontrado.' }
                  }

                  json = lancamento.toJSON()

                  json.boleto_id = null
                  json.boletos.forEach(b => {
                     if (b.status === 'Aberto' || b.status === 'Compensado') {
                        json.boleto_id = b.id
                     }
                  })

                  pessoa_id = item.pessoa_id

                  //json.boleto_id = item.boleto_id
                  json.dVencimento = moment(json.dVencimento).format(
                     'DD/MM/YYYY'
                  )

                  let arqPDF = 'ACBr/pdf/boleto_' + item.lancamento_id + '.pdf'
                  let linkBoleto = 'boleto_' + item.lancamento_id + '.pdf'

                  // Tabela de equipamentosAtivos
                  const respTabelaEquipa =
                     await new RateioServices().PDF_TodosEquipamentosRateioPorPessoa(
                        pessoa_id,
                        rateio_id,
                        false
                     )
                  let arquivoEquipa =
                     respTabelaEquipa.pasta + respTabelaEquipa.arquivo
                  let linkEquipa = respTabelaEquipa.arquivo

                  // Tabela de ocorrencias
                  const respTabelaOcorrencias =
                     await new RateioServices().PDF_RateioRelatorioOcorrencias(
                        rateio_id,
                        false
                     )
                  const arquivoOcorrencia =
                     respTabelaOcorrencias.pasta + respTabelaOcorrencias.arquivo
                  let linkOcorrencia = respTabelaOcorrencias.arquivo

                  let numeroTelefone = '55' + json.pessoa.telSms
                  if (Env.get('NODE_ENV') === 'development') {
                     numeroTelefone = '5531987034132'
                  }

                  let tempoSegundos =
                     key === '0' ? 100 : this.getRandomInt(40, 80) * 1000

                  await this.espera(tempoSegundos)

                  console.log('zap')

                  lancamento.isZap = 1
                  await lancamento.save()

                  topic = Ws.getChannel('zap_massa:*').topic(
                     'zap_massa:zap_massa'
                  )
                  if (topic) {
                     topic.broadcast('message', {
                        operation: 'enviado',
                        data: lancamento.toJSON(),
                     })
                  }

                  let associado = json.pessoa.nome.toUpperCase()
                  let valorTotal = new Intl.NumberFormat('de-DE').format(
                     lancamento.valorTotal
                  )
                  let dVencimento = moment(
                     lancamento.dVencimento,
                     'YYYY-MM-DD'
                  ).format('DD/MM/YYYY')

                  const URL_SERVIDOR_WEB = Env.get('URL_SERVIDOR_WEB')

                  const digitoCPF = json.pessoa.cpfCnpj.substring(0, 2)

                  //let msgPersonalizada = `Olá Associado! Seguem os relatórios do rateio e o boleto emitido para ${associado}, com vencimento para o dia ${dVencimento}, no valor de R$ ${valorTotal}.`
                  //let msgPersonalizada = `Olá Associado! Esta mensagem é para lembrar que o rateio do mês de abril foi fechado. Os relatórios do rateio e o boleto emitido para ${associado}, com vencimento para o dia ${dVencimento}, no valor de R$ ${valorTotal} serão enviados por e-mail. Caso não receba no prazo de 24 horas, entre em contato.`
                  //let msgPersonalizada = `Olá ${associado}! Esta mensagem é para lembrar que o rateio do mês de abril foi fechado. Os relatórios do rateio e o boleto com vencimento para o dia ${dVencimento}, no valor de R$ ${valorTotal} serão enviados por e-mail. Caso não receba no prazo de 24 horas, entre em contato conosco.`
                  //let msgPersonalizada = `Olá *${associado}!*\r\nEsta mensagem é para lembrar que o rateio do mês de junho foi fechado.\r\nOs relatórios do rateio e o boleto com vencimento para o dia *${dVencimento}*, no valor de R$ ${valorTotal} estão disponíveis nos seguintes endereços:\r\n`
                  let msgPersonalizada = `Olá *${associado}!*\r\nEsta mensagem é para lembrar que o rateio do mês de julho foi fechado.\r\nOs relatórios do rateio e o boleto com vencimento para o dia *${dVencimento}*, no valor de R$ ${valorTotal} estão disponíveis no seguinte endereço:\r\n`

                  //let msgLinks = `*1) Boleto:* ${URL_SERVIDOR_WEB}/view/${linkBoleto}/b\r\n*2) Veículo:* ${URL_SERVIDOR_WEB}/view/${linkEquipa}/\r\n*3) Ocorrências:* ${URL_SERVIDOR_WEB}/view/${linkOcorrencia}/o`
                  let msgLinks = `${URL_SERVIDOR_WEB}/rateio/${rateio_id}_${pessoa_id}${digitoCPF}`

                  //numeroTelefone = '31987034132'
                  let service = await ServiceZap().sendMessage(
                     numeroTelefone,
                     msgPersonalizada + msgLinks
                  )

                  /*let service = await ServiceZap().sendMessage(
                     numeroTelefone,
                     msgPersonalizada // msg+ msgLinks,
                     //`${URL_SERVIDOR_WEB}/view/${linkBoleto}/b`
                  )*/

                  let mensagem =
                     'Nr.' + numeroTelefone + '. Enviado com sucesso!'
                  let status = 'Enviado'
                  let response = 'Nr.' + numeroTelefone
                  if (
                     service.result === 'falha' ||
                     service.result === 'error'
                  ) {
                     mensagem = 'Ocorreu falha no envio'
                     status = 'Falhou'
                  }

                  this.logZap({
                     tipo: 'zap',
                     mensagem,
                     response,
                     status,
                     boleto_id: json.boleto_id,
                     pessoa_id: json.pessoa_id,
                  })
               } catch (error) {
                  let res = null

                  if (lancamento) {
                     res = lancamento
                     lancamento.isZap = 2
                     await lancamento.save()

                     if (json) {
                        this.logZap(error, json)
                     } else {
                        this.logZap(error, item)
                     }
                  }

                  topic = Ws.getChannel('zap_massa:*').topic(
                     'zap_massa:zap_massa'
                  )

                  if (topic) {
                     topic.broadcast('message', {
                        operation: 'falha_envio',
                        data: res,
                     })
                  }
               }

               yield true
            }
         }
      } catch (error) {
         topic = Ws.getChannel('zap_massa:*').topic('zap_massa:zap_massa')

         if (topic) {
            topic.broadcast('message', {
               operation: 'falha_envio',
               data: o,
            })
         }

         yield false
      }
   }

   async espera(tempo = 1000) {
      return new Promise(async (resolve, reject) => {
         setTimeout(() => {
            resolve(true)
         }, tempo)
      })
   }

   async onZapMassa(data = null) {
      try {
         let topic = Ws.getChannel('zap_massa:*').topic('zap_massa:zap_massa')
         console.log('onZap ', data)
         const rateio_id = data.rateio_id
         const lista = data.lista
         this.listaSelecionados = data.lista

         const iterator = this.dispararZapMassa({ rateio_id, lista })

         let it = true
         while (it) {
            let r = await iterator.next()
            if (r.done) {
               it = false
            }
            if (topic) {
               this.socket.emit('message', r)
            }
         }
      } catch (e) {
         console.log(
            'Ocorreu uma falha no metodo onZapMassa (ZapMassaController'
         )
         console.log(e)
         console.log('dados ', data)
         if (topic) {
            this.socket.emit('message')
         }
      }
   }
}

module.exports = ZapMassaController
