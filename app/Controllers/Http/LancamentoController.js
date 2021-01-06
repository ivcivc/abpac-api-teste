'use strict'

const Database = use('Database')
const LancamentoService = use('App/Services/Lancamento')

const kue = use('Kue')
const Job = use('App/Jobs/ACBr')

class LancamentoController {
   async index({ params, request, response }) {}

   async store({ request, response, auth }) {
      const payload = request.all()

      let trx = null

      try {
         trx = await Database.beginTransaction()

         const model = await new LancamentoService().add(payload, trx, auth)

         await trx.commit()

         if (model.pessoa_id) {
            await model.load('pessoa')
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
}

module.exports = LancamentoController
