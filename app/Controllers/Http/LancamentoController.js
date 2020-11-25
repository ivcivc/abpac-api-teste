'use strict'

const LancamentoService = use('App/Services/Lancamento')

class LancamentoController {
   async index({ params, request, response }) {}

   async store({ request, response, auth }) {
      const payload = request.all()

      try {
         const model = await new LancamentoService().add(payload, null, auth)

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
      console.log('oi')
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
}

module.exports = LancamentoController
