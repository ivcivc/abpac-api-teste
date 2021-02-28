'use strict'
const Model = use('App/Models/Restricao')

class RestricaoController {
   async index({ response }) {
      try {
         const model = await Model.all()

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async store({ request, response }) {
      const payload = request.all()

      try {
         const model = await Model.create(payload)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async show({ params, response }) {
      try {
         const model = await Model.findOrFail(params.id)

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

   async update({ params, request, response }) {
      const payload = request.all()
      const ID = params.id

      try {
         const model = await Model.findOrFail(ID)

         model.merge(payload)

         await model.save()

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async destroy({ params, request, response }) {
      const ID = params.id
      try {
         const model = await Model.findOrFail(ID)
         await model.delete()

         response.status(200).send(true)
      } catch (error) {
         response.status(400).send(error)
      }
   }
}

module.exports = RestricaoController
