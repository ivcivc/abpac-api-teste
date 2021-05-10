'use strict'

const Redis = use('Redis')
const Drive = use('Drive')
const Helpers = use('Helpers')
const Env = use('Env')

const RateioServices = use('App/Services/Rateio')
const ModelLancamento = use('App/Models/Lancamento')
const ModelEmailLog = use('App/Models/EmailLog')
const Mail = use('Mail')

const moment = use('moment')
const lodash = use('lodash')

const Ws = use('Ws')

class EmailMassaController {
   constructor({ socket, request }) {
      this.socket = socket
      this.request = request
      this.topic = socket.topic
      console.log(`Back ${this.topic} connected to WS ${this.topic}`)
   }

   async onMessage(e) {
      console.log('message disparada')
      this.socket.emit('message', e)
   }

   async onIsPDFBusy() {
      //console.log('message onIsPDFBusy')
      let res = await Redis.get('_gerarFinanceiro')

      let lResp = false
      if (res !== 'livre') {
         lResp = true
      }

      let topic = Ws.getChannel('email_massa:*').topic(
         'email_massa:email_massa'
      )

      if (topic) {
         //console.log('busy')
         this.socket.emit('message', {
            operation: 'isPDFBusy',
            data: lResp,
         })
      }

   }

   async espera(tempo = 1000) {
      return new Promise(async (resolve, reject) => {
         setTimeout(() => {
            resolve(true)
         }, tempo)
      })
   }

   async emailLog(resp, item) {
      let mensagem = ''
      let isFalha = true
      let boleto_id = item.boleto_id
      let response = ''

      if (lodash.has(resp, 'code')) {
         mensagem = resp.message
         isFalha = true
         response = resp.stack
      }

      if (lodash.has(resp, 'rejected')) {
         resp.rejected.forEach(e => {
            if (!lodash.isEmpty(mensagem)) {
               mensagem = mensagem + '/n/r' + e
            } else {
               mensagem = e
            }
         })
         isFalha = true
         response = resp.response
      }

      if (lodash.has(resp, 'accepted')) {
         isFalha = false
         resp.accepted.forEach(e => {
            if (!lodash.isEmpty(mensagem)) {
               mensagem = mensagem + '/n/r' + e
            } else {
               mensagem = e
            }
         })
         response = resp.response
      }

      let status = isFalha ? 'Falhou' : 'Enviado'

      const log = await ModelEmailLog.create({
         mensagem,
         status,
         response,
         boleto_id,
      })
   }

   async buscarLancamento(lancamento_id) {
      return new Promise(async (resolve, reject) => {
         try {
            const lancamento = await ModelLancamento.findOrFail(lancamento_id)
            await lancamento.load('pessoa')

            resolve(lancamento)
         } catch (error) {
            reject(error)
         }
      })
   }

   async *dispararEmailMassa(o) {
      let topic = null
      let lancamento = null

      try {
         const rateio_id = o.rateio_id
         const lista = o.lista

         for (const key in lista) {
            if (Object.hasOwnProperty.call(lista, key)) {
               let item = null
               try {
                  item = lista[key]

                  topic = Ws.getChannel('email_massa:*').topic(
                     'email_massa:email_massa'
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
                  /*lancamento = await ModelLancamento.findOrFail(
                     item.lancamento_id
                  )
                  await lancamento.load('pessoa')*/

                  const pessoa_id = item.pessoa_id

                  let json = lancamento.toJSON()
                  json.boleto_id = item.boleto_id
                  json.dVencimento = moment(json.dVencimento).format(
                     'DD/MM/YYYY'
                  )

                  let arqPDF = 'ACBr/pdf/boleto_' + item.lancamento_id + '.pdf'

                  // Tabela de equipamentosAtivos
                  const respTabelaEquipa = await new RateioServices().PDF_TodosEquipamentosRateioPorPessoa(
                     pessoa_id,
                     rateio_id,
                     false
                  )
                  let arquivoEquipa =
                     respTabelaEquipa.pasta + respTabelaEquipa.arquivo

                  // Tabela de ocorrencias
                  const respTabelaOcorrencias = await new RateioServices().PDF_RateioRelatorioOcorrencias(
                     rateio_id,
                     false
                  )
                  const arquivoOcorrencia =
                     respTabelaOcorrencias.pasta + respTabelaOcorrencias.arquivo

                  let email = json.pessoa.email
                  if (Env.get('NODE_ENV') === 'development') {
                     email = 'ivan.a.oliveira@terra.com.br'
                  }

                  await this.espera(1000)

                  let send = await Mail.send(
                     'emails.rateio_boleto',
                     json,
                     message => {
                        message
                           .to(email)
                           .from(Env.get('MAIL_EMPRESA'))
                           .subject('Boleto ABPAC')
                           .attach(arquivoEquipa, {
                              filename: 'lista_veiculos.pdf',
                           })
                           .attach(arquivoOcorrencia, {
                              filename: 'lista_ocorrencias.pdf',
                           })
                           .attach(Helpers.tmpPath(arqPDF), {
                              filename: 'boleto.pdf',
                           })
                        /*.embed(
                                 Helpers.publicPath('images/logo-abpac.png'),
                                 'logo'
                              )*/
                     }
                  )

                  lancamento.isEmail = 1
                  await lancamento.save()

                  topic = Ws.getChannel('email_massa:*').topic(
                     'email_massa:email_massa'
                  )
                  if (topic) {
                     topic.broadcast('message', {
                        operation: 'enviado',
                        data: lancamento.toJSON(),
                     })
                  }

                  this.emailLog(send, item)
               } catch (error) {
                  let res = null

                  if (lancamento) {
                     res = lancamento
                     lancamento.isEmail = 2
                     await lancamento.save()

                     this.emailLog(error, item)
                  }

                  topic = Ws.getChannel('email_massa:*').topic(
                     'email_massa:email_massa'
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
         topic = Ws.getChannel('email_massa:*').topic('email_massa:email_massa')

         if (topic) {
            topic.broadcast('message', {
               operation: 'falha_envio',
               data: o,
            })
         }

         yield false
      }
   }

   async onEmailMassa(data = null) {
      if (!data) {
      }
      console.log(data)
      await Redis.set('_gerarFinanceiro', 'email-massa')

      let topic = Ws.getChannel('email_massa:*').topic(
         'email_massa:email_massa'
      )
      if (topic) {
         topic.broadcast('message', {
            operation: 'isPDFBusy',
            data: await Redis.get('_gerarFinanceiro'),
         })
      }

      const rateio_id = data.rateio_id
      const lista = data.lista

      const iterator = this.dispararEmailMassa({ rateio_id, lista })

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

      await Redis.set('_gerarFinanceiro', 'livre')
   }
}

module.exports = EmailMassaController
