'use strict'

const RateioServices = use('App/Services/Rateio')
const CnabService = use('App/Services/Cnab')

const Database = use('Database')

const Redis = use('Redis')

const ModelBoletoConfig = use('App/Models/BoletoConfig')
const ModelLancamento = use('App/Models/Lancamento')
const ModelEmailLog = use('App/Models/EmailLog')
const Mail = use('Mail')

const Env = use('Env')
const Helpers = use('Helpers')
const moment = use('moment')
const lodash = use('lodash')

const ModelBoleto = use('App/Models/Boleto')
const ModelConta = use('App/Models/Conta')

const Boleto = use('App/Services/Cnab')

const Ws = use('Ws')

// Fila para gerar financeiro (rateio), para gerar e fazer download PDF

class ACBrJob {
   // If this getter isn't provided, it will default to 1.
   // Increase this number to increase processing concurrency.
   static get concurrency() {
      return 1
   }

   // This is required. This is a unique key used to identify this job.
   static get key() {
      return 'acbr-job'
   }

   // This is where the work is done.
   async handle(data) {
      return new Promise(async (resolve, reject) => {
         const emailLog = async resp => {
            let mensagem = ''
            let isFalha = true
            let boleto_id = data.boleto_id
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

         // Módulo gerarCobrança individual ou de uma lista (Não utilizar para rateio)
         if (data.metodo === 'gerarCobranca') {
            let trx = null

            try {
               trx = await Database.beginTransaction()

               let arrBoletos = []

               let conta = null
               let boletoConfig = null

               // Contas (plano de contas)
               for (const key in data.lancamentos) {
                  if (Object.hasOwnProperty.call(data.lancamentos, key)) {
                     let e = data.lancamentos[key]

                     conta = await ModelConta.findOrFail(e.conta_id)

                     boletoConfig = await ModelBoletoConfig.findByOrFail(
                        'modelo',
                        conta.modeloBoleto
                     )

                     boletoConfig.nossoNumero = boletoConfig.nossoNumero + 1

                     await boletoConfig.save()

                     const objAddBoleto = {
                        conta_id: e.conta_id,
                        boleto_nota1: '',
                        boleto_nota2: '',
                        dVencimento: e.dVencimento,
                        dCompensacao: null,

                        nossoNumero: boletoConfig.nossoNumero,
                        lancamento_id: e.id,
                        pessoa_id: e.pessoa_id,

                        valorTotal: e.valorTotal,
                        status: 'Aberto',
                        lancamento: e,
                     }

                     arrBoletos.push(objAddBoleto)
                  }
               }

               for (const key in arrBoletos) {
                  if (Object.hasOwnProperty.call(arrBoletos, key)) {
                     let e = arrBoletos[key]
                     let o = lodash.cloneDeep(e)
                     delete o['lancamento']
                     ModelBoleto.create(o, trx ? trx : null)
                  }
               }

               let arrRemessa = []

               // preparar para geração da remessa.
               for (const key in arrBoletos) {
                  if (Object.hasOwnProperty.call(arrBoletos, key)) {
                     let e = arrBoletos[key]
                     e.modeloBoleto = boletoConfig.modelo

                     e.banco = conta.banco
                     e.agencia = conta.agencia
                     e.agenciaDV = conta.agenciaDV
                     e.contaCorrente = conta.contaCorrente
                     e.contaCorrenteDV = conta.contaCorrenteDV
                     e.convenio = conta.convenio

                     e.dVencimento2 = moment(
                        e.dVencimento,
                        'YYYY-MM-DD'
                     ).format('YYYY-MM-DD')
                     e.dVencimento = moment(e.dVencimento, 'YYYY-MM-DD').format(
                        'DD/MM/YYYY'
                     )

                     e.pessoa_nome = e.lancamento.pessoa.nome
                     e.cpfCnpj = e.lancamento.pessoa.cpfCnpj
                     e.endRua = e.lancamento.pessoa.endRua
                     e.endBairro = e.lancamento.pessoa.endBairro
                     e.endComplemento = e.lancamento.pessoa.endComplemento
                     e.endCidade = e.lancamento.pessoa.endCidade
                     e.endEstado = e.lancamento.pessoa.endEstado
                     e.endCep = e.lancamento.pessoa.endCep
                  }
               }

               const boleto = await new Boleto().gerarBoleto(arrBoletos)

               if (!boleto.success) {
                  console.log('ocorreu uma falha (gerarBoleto) em ACBr.js')
                  throw boleto
               }

               await Redis.set('_gerarFinanceiro', 'livre')

               await trx.commit()
               return resolve(true)
            } catch (error) {
               await Redis.set('_gerarFinanceiro', 'livre')
               await trx.rollback()
               console.log(e)
               reject(error)
               //throw error
            }
         }

         // Módulo gerarFinanceiro para rateio
         if (data.metodo === 'gerarFinanceiro') {
            console.log('JOB - Gerando financeiro')
            let trx = null

            try {
               trx = await Database.beginTransaction()

               const service = await new RateioServices().gerarFinanceiro(
                  data.payload,
                  trx,
                  data.auth
               )

               await trx.commit()

               console.log('financeiro gravado')

               resolve(service)

               console.log('inicionando geração de pdfs')

               // gerar os PDFs
               await Redis.set('_gerarFinanceiro', 'pdf')

               const pdf = await new CnabService().gerarPDF()
               if (!pdf.success) {
                  console.log('ocorreu falha na geração lista de pdfs')
               }

               await Redis.set('_gerarFinanceiro', 'livre')

               console.log('JOB - SAINDO Gerando financeiro')
               return
            } catch (error) {
               console.log(error)
               await Redis.set('_gerarFinanceiro', 'livre')
               await trx.rollback()
               return reject(error)
            }
         }

         // Módulo gerarPdf (não vai gerar remessa)
         if (data.metodo === 'gerar-pdf') {
            try {
               console.log('JOB - rodando metodo gerar-pdf')
               const server = await new CnabService().pdf(
                  data.boleto_id,
                  data.response
               )
               console.log('JOB - SAINDO rodando metodo gerar-pdf')
               return resolve(server)
            } catch (error) {
               /////await trx.rollback()
               console.log(error)
               reject(error)
               throw error
               return
            }
         }

         // Módulo downlad de pdf.
         if (data.metodo === 'pdf-download') {
            try {
               console.log('JOB - rodando metodo pdf-download')
               const cnab = await new CnabService().pdfDownload(data.arquivo)
               console.log('JOB - SAINDO rodando metodo pdf-download')
               return resolve(cnab)
            } catch (error) {
               /////await trx.rollback()
               reject(error)
               throw error
               return
            }
         }

         // Disparar email em massa (rateio)
         if (data.metodo === 'disparar-email-massa') {
            let topic = null
            //setTimeout(async () => {
            let lancamento = null

            try {
               console.log('JOB - disparar-email-massa')
               lancamento = await ModelLancamento.findOrFail(data.lancamento_id)
               await lancamento.load('pessoa')

               const pessoa_id = data.pessoa_id
               const rateio_id = data.rateio_id

               /*topic = Ws.getChannel('email_massa').topic('email_massa')
               if (topic) {
                  topic.broadcast('message', {
                     operation: 'enviando',
                     data: { pessoa_id },
                  })
               }*/

               let json = lancamento.toJSON()
               json.boleto_id = data.boleto_id
               json.dVencimento = moment(json.dVencimento).format('DD/MM/YYYY')

               let arqPDF = 'ACBr/pdf/boleto_' + data.lancamento_id + '.pdf'

               // Tabela de equipamentosAtivos
               const respTabelaEquipa = await new RateioServices().PDF_TodosEquipamentosRateioPorPessoa(
                  pessoa_id,
                  rateio_id,
                  false
               )

               // Tabela de ocorrencias
               const respTabelaOcorrencias = await new RateioServices().PDF_RateioRelatorioOcorrencias(
                  rateio_id,
                  false
               )

               let email = json.pessoa.email
               if (Env.get('NODE_ENV') === 'development') {
                  email = 'ivan.a.oliveira@terra.com.br'
               }

               const arqPDFequipa =
                  respTabelaEquipa.pasta + respTabelaEquipa.arquivo

               let send = await Mail.send(
                  'emails.rateio_boleto',
                  json,
                  message => {
                     message
                        .to(email)
                        .from(Env.get('MAIL_EMPRESA'))
                        .subject('Boleto ABPAC')
                        .attach(arqPDFequipa, {
                           filename: 'lista_veiculos.pdf',
                        })
                        .attach(
                           respTabelaOcorrencias.pasta +
                              respTabelaOcorrencias.arquivo,
                           {
                              filename: 'lista_ocorrencias.pdf',
                           }
                        )
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
                     data: lancamento,
                  })
               }

               emailLog(send)

               console.log('JOB - SAINDO disparar-email-massa')
               return resolve({ success: true })
            } catch (error) {
               lancamento.isEmail = 2
               await lancamento.save()
               emailLog(error)

               topic = Ws.getChannel('email_massa:*').topic(
                  'email_massa:email_massa'
               )

               if (topic) {
                  topic.broadcast('message', {
                     operation: 'falha_envio',
                     data: lancamento,
                  })
               }

               console.log('ocorreu uma falha no envio do email')
               resolve(error)
            }
            //}, 80)
         }
      })
   }
}

module.exports = ACBrJob
