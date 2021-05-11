'use strict'

const Database = use('Database')
const LancamentoService = use('App/Services/Lancamento')
const ModelEmailLog = use('App/Models/EmailLog')

const kue = use('Kue')
const Job = use('App/Jobs/ACBr')
const PessoaModel = use('App/Models/Pessoa')
const Redis = use('Redis')
const Env = use('Env')
const Drive = use('Drive')
const Helpers = use('Helpers')
const fs = require('fs')

class LancamentoController {
   async index({ params, request, response }) {}

   async store({ request, response, auth }) {
      const payload = request.all()

      let trx = null

      try {
         trx = await Database.beginTransaction()

         const model = await new LancamentoService().add(payload, trx, auth)

         //await trx.commit()

         if (model.pessoa_id) {
            //await model.load('pessoa')
         }

         await model.load('items')

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         //await new Erro().handle(error, {request, response})
         //throw new Erro(error, {request, response}).handle(error, {request, response})
         //response.status(400).send(error);
         throw error
      }
   }

   async show({ params, response }) {
      try {
         const model = await new LancamentoService().get(params.id)
         console.log('entrando')
         response.status(200).send({ type: true, data: model })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async update({ params, request, response, auth }) {
      const payload = request.all()
      const ID = params.id

      try {
         const model = await new LancamentoService().update(
            ID,
            payload,
            null,
            auth
         )

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async destroy({ params, request, response, auth }) {}

   async localizarPor({ request, response }) {
      const payload = request.all()
      let parametros = request.only(['continue', 'start', 'count'])

      try {
         const query = await new LancamentoService().localizarPor(
            payload,
            parametros
         )

         response.status(200).send(query)
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async cancelar({ request, response, auth }) {
      const payload = request.all()

      try {
         const query = await new LancamentoService().cancelar(
            payload,
            null,
            auth
         )

         response.status(200).send(query)
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async reverter_cancelamento({ request, response, auth }) {
      const payload = request.all()

      try {
         const query = await new LancamentoService().reverter_cancelamento(
            payload,
            null,
            auth
         )

         response.status(200).send(query)
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async cancelar_compensacao({ request, response, auth }) {
      const payload = request.all()

      try {
         const query = await new LancamentoService().cancelar_compensacao(
            payload,
            null,
            auth
         )

         response.status(200).send(query)
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }
   async inadimplente({ request, response, auth }) {
      /* Gerar conta indadimplemnte */
      const payload = request.all()

      try {
         const query = await new LancamentoService().inadimplente(
            payload,
            null,
            auth
         )

         response.status(200).send(query)
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async reverter_inadimplente({ request, response, auth }) {
      /* Gerar conta indadimplemnte */
      const payload = request.all()

      try {
         const query = await new LancamentoService().reverter_inadimplente(
            payload,
            null,
            auth
         )

         response.status(200).send(query)
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async acordo({ request, response, auth }) {
      /* Gerar conta indadimplemnte */
      const payload = request.all()

      try {
         const query = await new LancamentoService().acordo(payload, null, auth)

         response.status(200).send(query)
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async gerarLancamentos({ request, response, auth }) {
      /* Gerar conta indadimplemnte */
      const payload = request.all()
      console.log('entrando.............')
      try {
         const query = await new LancamentoService().gerarLancamentos(
            payload,
            null,
            auth
         )

         response.status(200).send(query)
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async destroyOS({ request, response, auth }) {
      /* Excluir */
      const payload = request.all()

      try {
         const query = await new LancamentoService().destroyOS(
            payload.ordem_servico_id,
            null,
            auth
         )

         response.status(200).send(query)
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async pdf({ response, params }) {
      try {
         const data = { boleto_id: params.boleto_id, metodo: 'gerar-pdf' } // Data to be passed to job handle
         const priority = 'normal' // Priority of job, can be low, normal, medium, high or critical
         const attempts = 1 // Number of times to attempt job if it fails
         const remove = true // Should jobs be automatically removed on completion
         const jobFn = job => {
            // Function to be run on the job before it is saved
            job.backoff()
         }
         const job = kue.dispatch(Job.key, data, {
            priority,
            attempts,
            remove,
            jobFn,
         })

         // If you want to wait on the result, you can do this
         const result = await job.result

         return result
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async pdfDownload({ response, params }) {
      const data = { arquivo: params.arquivo, metodo: 'pdf-download' } // Data to be passed to job handle
      const priority = 'normal' // Priority of job, can be low, normal, medium, high or critical
      const attempts = 1 // Number of times to attempt job if it fails
      const remove = true // Should jobs be automatically removed on completion
      const jobFn = job => {
         // Function to be run on the job before it is saved
         job.backoff()
      }
      const job = kue.dispatch(Job.key, data, {
         priority,
         attempts,
         remove,
         jobFn,
      })

      // If you want to wait on the result, you can do this
      const result = await job.result

      return response
         .header('Content-type', 'application/pdf')
         .download(result.arquivo)
   }

   async espera(tempo = 1000) {
      return new Promise(async (resolve, reject) => {
         setTimeout(() => {
            resolve(true)
         }, tempo)
      })
   }

   async logZap(oLog, ID = null) {

      if ( ! ID ) {
         return await ModelEmailLog.create(oLog)
      } else {
         let log = await ModelEmailLog.find(ID)
         if (!log) return null
         log.merge(oLog)
         log.save()
         return log
      }

   }


   async sendZapBoleto({ response, request }) {

      return new Promise(async (resolve, reject) => {
         const payload = request.all()
         const ServiceZap = use('App/Services/Zap/MyZap')

         const pessoa_id= payload.pessoa_id ? payload.pessoa_id : null
         const isAnexarBoleto= payload.isAnexarBoleto ? payload.isAnexarBoleto : false
         const isAnexarRelEquipamentos= payload.isAnexarRelEquipamentos ? payload.isAnexarRelEquipamentos : false
         const isAnexarRelOcorrencias= payload.isAnexarRelOcorrencias ? payload.isAnexarRelOcorrencias : false
         const message= payload.message
         const boleto_id= payload.boleto_id
         const rateio_id = payload.rateio_id
         const lancamento_id= payload.lancamento_id

         let process= null

         let ID_Mensagem= null
         let ID_Boleto= null
         let ID_Equipamento= null
         let ID_Ocorrencia= null

         try {

            // Log para envio de mensagem
            let oLog= {
               pessoa_id,
               mensagem: `Nr. ${payload.telSms}. "${message}"`,
               boleto_id: boleto_id,
               response: "Mensagem enviada. Aguarde resposta!",
               status: "pendente",
               tipo: 'zap'
            }
            const registro= await this.logZap(oLog)
            ID_Mensagem=  registro.id


            if ( isAnexarBoleto ) {
               let oLog= {
                  pessoa_id,
                  mensagem: `Nr. ${payload.telSms}. Envio de boleto.`,
                  boleto_id: boleto_id,
                  response: "Boleto enviado. Aguarde resposta!",
                  status: "pendente",
                  tipo: 'zap'
               }
               const registro= await this.logZap(oLog)
               ID_Boleto= registro.id
            }

            if ( isAnexarRelEquipamentos ) {
               let oLog= {
                  pessoa_id,
                  mensagem: `Nr. ${payload.telSms}. Envio relatório equipamentos`,
                  boleto_id: boleto_id,
                  response: "Relatório equipamentos enviado. Aguarde resposta!",
                  status: "pendente",
                  tipo: 'zap'
               }
               const registro= await this.logZap(oLog)
               ID_Equipamento= registro.id
            }

            if ( isAnexarRelOcorrencias ) {
               let oLog= {
                  pessoa_id,
                  mensagem: `Nr. ${payload.telSms}. Envio relatório ocorrências`,
                  boleto_id: boleto_id,
                  response: "Relatório de ocorrencias enviado. Aguarde resposta!",
                  status: "pendente",
                  tipo: 'zap'
               }
               const registro= await this.logZap(oLog)
               ID_Ocorrencia= registro.id
            }

            // Retorno antecipado para o cliente....
            setTimeout(() => {
               return resolve({ success: true })
            }, 4000)

            process= 1

            let tel = '55' + payload.telSms
            tel = tel.replace(/[^\d]+/g, '')

            const res= await ServiceZap().sendMessage(
               tel,
               payload.message
            )

            oLog= {
               boleto_id: boleto_id,
               response: res.result === 'success' ? "Mensagem enviada com sucesso!" : `Status: ${res.result}`,
               status: res.result === 'success' ? "Enviado" : "falha",
               tipo: 'zap'
            }

            await this.logZap(oLog, ID_Mensagem)

            await this.espera(100)

            if ( isAnexarBoleto ) {
               process= 2
               const pastaPDF = Helpers.tmpPath('ACBr/pdf/')
               const filePath =
                  pastaPDF + 'boleto_' + payload.lancamento_id + '.pdf'
               const fileName = 'boleto_' + payload.lancamento_id + '.pdf'

               const isExist = await Drive.exists(filePath)

               if (isExist) {
                  fs.readFile(
                     filePath,
                     { encoding: 'base64' },
                     async (err, data) => {
                        if (err) {
                           throw err
                        }
                        let res = await ServiceZap().sendFile(
                           tel,
                           message,
                           'abpac_boleto.pdf',
                           data
                        )

                        let oLog= {
                           response: res.result === 'success' ? "Boleto enviado com sucesso!" : `Status: ${res.result}`,
                           status: res.result === 'success' ? "Enviado" : "falha"
                        }
                        await this.logZap(oLog, ID_Boleto)

                     }
                  )
               } else {
                  console.log(
                     'Arquivo (pdfDownload(cnab) não localizado ',
                     arquivo
                  )
                  throw {
                     success: false,
                     arquivo: null,
                     message: 'Arquivo não localizado',
                  }
               }
            }

            await this.espera(160)

            if ( isAnexarRelEquipamentos ) {
               process= 3
               const pasta = Helpers.tmpPath('rateio/equipamentos/')
               const filePath =
                  pasta + 'equip_' + rateio_id + '_'  + pessoa_id + '.pdf'
               const fileName = 'equip_' + rateio_id + '_'  + pessoa_id + '.pdf'

               const isExist = await Drive.exists(filePath)

               if (isExist) {
                  fs.readFile(
                     filePath,
                     { encoding: 'base64' },
                     async (err, data) => {
                        if (err) {
                           throw err
                        }
                        let res = await ServiceZap().sendFile(
                           tel,
                           message,
                           'equipamentos.pdf',
                           data
                        )

                        let oLog= {

                           response: res.result === 'success' ? "Relatório equipamentos enviado com sucesso!" : `Status: ${res.result}`,
                           status: res.result === 'success' ? "Enviado" : "falha"
                        }
                        await this.logZap(oLog, ID_Equipamento)
                     }
                  )
               } else {
                  console.log(
                     'Arquivo (pdfEquipamentos não localizado ',
                     arquivo
                  )
                  throw {
                     success: false,
                     arquivo: null,
                     message: 'Arquivo de equipamento não localizado',
                  }
               }
            }

            await this.espera(250)

            if ( isAnexarRelOcorrencias ) {
               process= 4
               const pasta = Helpers.tmpPath('rateio/ocorrencias/')
               const filePath =
                  pasta + 'rateio_ocorrencias_' + rateio_id + '.pdf'
               const fileName = 'rateio_ocorrencias' + rateio_id + '.pdf'

               const isExist = await Drive.exists(filePath)

               if (isExist) {
                  fs.readFile(
                     filePath,
                     { encoding: 'base64' },
                     async (err, data) => {
                        if (err) {
                           throw err
                        }
                        let res = await ServiceZap().sendFile(
                           tel,
                           message,
                           'ocorrencias.pdf',
                           data
                        )

                        let oLog= {
                           response: res.result === 'success' ? "Relatório ocorrências enviado com sucesso!" : `Status: ${res.result}`,
                           status: res.result === 'success' ? "Enviado" : "falha"
                        }
                        await this.logZap(oLog, ID_Ocorrencia)
                     }
                  )
               } else {
                  console.log(
                     'Arquivo (pdfOcorrencias não localizado ',
                     arquivo
                  )
                  throw {
                     success: false,
                     arquivo: null,
                     message: 'Arquivo de ocorrência não localizado',
                  }
               }
            }


         } catch (e) {

            reject(e)

            let oLog= {
               pessoa_id,
               mensagem: `Nr. ${payload.telSms}. "${message}"`,
               boleto_id: boleto_id,
               response: "Ocorreu falha de comunicação com o servidor",
               status: "falha",
               tipo: 'zap'
            }

            if ( process == 1) {
               let oLog= {}
               oLog.response= "Ocorreu falha ao tentar enviar uma mensagem."
               oLog.status= 'falha'
               await this.logZap(oLog, ID_Mensagem)
            }
            if ( process == 2) {
               let oLog= {}
               oLog.response= "Ocorreu falha ao tentar enviar boleto."
               oLog.status= 'falha'
               await this.logZap(oLog, ID_Boleto)
            }
            if ( process == 3) {
               let oLog= {}
               oLog.response= "Ocorreu falha ao tentar enviar relatório equipamentos."
               oLog.status= 'falha'
               await this.logZap(oLog, ID_Equipamento)
            }
            if ( process == 4) {
               let oLog= {}
               oLog.response= "Ocorreu falha ao tentar enviar relatório ocorrência."
               oLog.status= 'falha'
               await this.logZap(oLog, ID_Ocorrencia)
            }

            if ( process == 0 ) {
               await this.logZap(oLog)
            }


         }
      })
   }

   async gerarBoleto({ request, response, auth }) {
      const payload = request.all()

      try {
         const _gerarFinanceiro = await Redis.get('_gerarFinanceiro')
         if (!_gerarFinanceiro) {
            await Redis.set('_gerarFinanceiro', 'financeiro') // gerar financeiro
         } else {
            if (_gerarFinanceiro === 'livre') {
               await Redis.set('_gerarFinanceiro', 'financeiro') // gerar financeiro
            } else {
               await Redis.set('_gerarFinanceiro', 'livre')
               throw {
                  success: false,
                  message:
                     'Existe um processamento pendente no servidor. Aguarde a finalização.',
               }
            }
         }

         const service = await new LancamentoService().gerarBoleto(
            payload,
            auth
         )

         await Redis.set('_gerarFinanceiro', 'livre')
         response.status(200).send({ type: true, data: service })
      } catch (error) {
         await Redis.set('_gerarFinanceiro', 'livre')
         //await trx.rollback()
         console.log(error)
         response.status(400).send(error)
      }
   }
}

module.exports = LancamentoController
