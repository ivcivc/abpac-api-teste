'use strict'
const Database = use('Database')

const Redis = use('Redis')

const RateioServices = use('App/Services/Rateio')

const kue = use('Kue')
const Job = use('App/Jobs/ACBr')

class RateioController {
   async equipamentosAtivos({ request, response }) {
      //const payload = request.all()

      try {
         const retorno = await new RateioServices().equipamentosAtivos()
         response.status(200).send({ type: true, data: retorno })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async lista_os({ request, response }) {
      //const payload = request.all()

      try {
         const retorno = await new RateioServices().lista_os()
         response.status(200).send({ type: true, data: retorno })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async inadimplentes({ request, response }) {
      //const payload = request.all()

      try {
         const retorno = await new RateioServices().inadimplentes()
         response.status(200).send({ type: true, data: retorno })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async index({ request, response }) {
      try {
         const model = await new RateioServices().index()

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async config({ request, response }) {
      try {
         const model = await new RateioServices().config()

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async addOrUpdateConfig({ request, response }) {
      try {
         const payload = request.all()

         const model = await new RateioServices().addOrUpdateConfig(payload)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async show({ params, request, response }) {
      const id = params.id

      try {
         const model = await new RateioServices().get(id)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async store({ request, response, auth }) {
      const payload = request.all()

      let trx = null

      try {
         trx = await Database.beginTransaction()

         const model = await new RateioServices().add(payload, trx, auth)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         await trx.rollback()
         response.status(400).send(error)
      }
   }

   async simulador({ request, response, auth }) {
      const payload = request.all()

      let trx = null

      try {
         trx = await Database.beginTransaction()

         const model = await new RateioServices().simulador(payload, trx, auth)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         await trx.rollback()
         response.status(400).send(error)
      }
   }

   async update({ params, request, response }) {
      const payload = request.all()
      const ID = params.id

      try {
         const rateio = await new RateioServices().update(ID, payload)

         response.status(200).send({ type: true, data: rateio })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async destroy({ params, request, response }) {}

   async gerarFinanceiroLoc({ params, response, auth }) {
      const id = params.id

      try {
         const model = await new RateioServices().gerarFinanceiroLoc(id, auth)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async gerarFinanceiro({ request, response, auth }) {
      const payload = request.all()

      try {
         const _gerarFinanceiro = await Redis.get('_gerarFinanceiro')
         if (!_gerarFinanceiro) {
            await Redis.set('_gerarFinanceiro', 'financeiro') // gerar financeiro
         } else {
            if (_gerarFinanceiro === 'livre') {
               await Redis.set('_gerarFinanceiro', 'financeiro') // gerar financeiro
            } else {
               throw {
                  success: false,
                  message:
                     'Existe um processamento pendente no servidor. Aguarde a finalização.',
               }
            }
         }

         let aut = auth.user.toJSON()
         let oAuth = { user: aut }
         const data = { payload, auth: oAuth, metodo: 'gerarFinanceiro' } // Data to be passed to job handle
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

         response.status(200).send({ type: true, data: service })
      } catch (error) {
         // await trx.rollback()

         response.status(400).send(error)
      }
   }

   async localizarEmailMassa({ params, response, auth }) {
      const rateio_id = params.id

      try {
         const model = await new RateioServices().localizarEmailMassa(
            rateio_id,
            auth
         )

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async dispararEmailMassa({ request, response, auth }) {
      const payload = request.all()

      try {
         const _gerarFinanceiro = await Redis.get('_gerarFinanceiro')
         if (!_gerarFinanceiro) {
            await Redis.set('_gerarFinanceiro', 'email-massa') // gerar financeiro
         } else {
            if (_gerarFinanceiro === 'livre') {
               await Redis.set('_gerarFinanceiro', 'email-massa') // gerar financeiro
            } else {
               throw {
                  success: false,
                  message:
                     'Existe um processamento pendente no servidor. Aguarde a finalização.',
               }
            }
         }

         response.status(200).send({
            type: true,
            message:
               'Disparo de email realizado com sucesso. Aguarde o processamento do servidor.',
         })

         setTimeout(async () => {
            const model = await new RateioServices().dispararEmailMassa(
               payload,
               auth
            )
         }, 30)

         return

         //response.status(200).send({ type: true  })
      } catch (error) {
         console.log('nivel 2-a')
         response.status(400).send(error)
      }
   }

   async statusEmailMassa({ request, response, params }) {
      const boleto_id = params.boleto_id

      try {
         const model = await new RateioServices().statusEmailMassa(boleto_id)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }
}

module.exports = RateioController
