'use strict'

const RateioServices = use('App/Services/Rateio')
const CnabService = use('App/Services/Cnab')

const Database = use('Database')

const Redis = use('Redis')

const ModelLancamento = use('App/Models/Lancamento')
const ModelEmailLog = use('App/Models/EmailLog')
const Mail = use('Mail')

const Env = use('Env')
const Helpers = use('Helpers')
const moment = use('moment')
const lodash = use('lodash')

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

         // Módulo gerarFinanceiro
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

               console.log('inicioando geração de pdfs')

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
               await trx.rollback()
               reject(error)
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
               await trx.rollback()
               reject(error)
            }
         }

         // Disparar email em massa (rateio)
         if (data.metodo === 'disparar-email-massa') {
            setTimeout(async () => {
               let lancamento = null
               try {
                  console.log('JOB - disparar-email-massa')
                  lancamento = await ModelLancamento.findOrFail(
                     data.lancamento_id
                  )
                  await lancamento.load('pessoa')

                  let json = lancamento.toJSON()
                  json.boleto_id = data.boleto_id
                  json.dVencimento = moment(json.dVenciment).format(
                     'DD/MM/YYYY'
                  )

                  let arqPDF = 'ACBr/pdf/boleto_' + data.lancamento_id + '.pdf'

                  let send = await Mail.send(
                     'emails.rateio_boleto',
                     json,
                     message => {
                        message
                           .to(json.pessoa.email)
                           .from('investimentos@abpac.com.br')
                           .subject('Cobrança ABPAC')
                           .attach(Helpers.tmpPath(arqPDF))
                        /*.embed(
                              Helpers.publicPath('images/logo-abpac.png'),
                              'logo'
                           )*/
                     }
                  )

                  lancamento.isEmail = 1
                  await lancamento.save()

                  emailLog(send)

                  console.log('JOB - SAINDO disparar-email-massa')
                  return resolve({ success: true })
               } catch (error) {
                  lancamento.isEmail = 2
                  await lancamento.save()
                  emailLog(error)

                  console.log('ocorreu uma falha no envio do email')
                  resolve(error)
               }
            }, 50)
         }
      })
   }
}

module.exports = ACBrJob
