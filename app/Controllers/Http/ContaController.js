'use strict'

const Service = use('App/Services/Conta')

class ContaController {
   async index({ response }) {
      try {
         const model = await new Service().index()

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   /**
    * Create/save a new model.
    * POST models
    */
   async store({ request, response }) {
      const payload = request.all()

      payload['status'] = 'Ativo'

      try {
         const model = await new Service().add(payload)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   /**
    * Display a single model.
    * GET models/:id
    */
   async show({ params, response }) {
      try {
         const model = await new Service().get(params.id)

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

   /**
    * Update model details.
    * PUT or PATCH models/:id
    */
   async update({ params, request, response }) {
      const payload = request.all()
      const ID = params.id

      try {
         const model = await new Service().update(ID, payload)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   /**
    * Delete a model with id.
    * DELETE models/:id
    *
    * @param {object} ctx
    * @param {Request} ctx.request
    * @param {Response} ctx.response
    */
   async destroy({ params, response }) {
      const ID = params.id

      try {
         const model = await new Service().del(ID)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }
}

module.exports = ContaController
