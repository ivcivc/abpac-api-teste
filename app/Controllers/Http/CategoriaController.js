'use strict'

const CategoriaServices = use('App/Services/Categoria')

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/**
 * Resourceful controller for interacting with categorias
 */
class CategoriaController {
   /**
    * Show a list of all categorias.
    * GET categorias
    */
   async index({ response }) {
      try {
         const categoria = await new CategoriaServices().index()

         response.status(200).send({ type: true, data: categoria })
      } catch (error) {
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   /**
    * Create/save a new categoria.
    * POST categorias
    */
   async store({ request, response }) {
      const payload = request.all()

      payload['status'] = 'Ativo'

      try {
         const categoria = await new CategoriaServices().add(payload)

         response.status(200).send({ type: true, data: categoria })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   /**
    * Display a single categoria.
    * GET categorias/:id
    */
   async show({ params, response }) {
      try {
         const categoria = await new CategoriaServices().get(params.id)

         response.status(200).send({ type: true, data: categoria })
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
    * Update categoria details.
    * PUT or PATCH categorias/:id
    */
   async update({ params, request, response }) {
      const payload = request.all()
      const ID = params.id

      try {
         const categoria = await new CategoriaServices().update(ID, payload)

         response.status(200).send({ type: true, data: categoria })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async ordenar({ request, response }) {
      const payload = request.all()

      try {
         const categoria = await new CategoriaServices().ordenar(payload.lista)

         response.status(200).send({ type: true, data: categoria })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   /**
    * Delete a categoria with id.
    * DELETE categorias/:id
    *
    * @param {object} ctx
    * @param {Request} ctx.request
    * @param {Response} ctx.response
    */
   async destroy({ params, response }) {
      const ID = params.id

      try {
         const categoria = await new CategoriaServices().del(ID)

         response.status(200).send({ type: true, data: categoria })
      } catch (error) {
         response.status(400).send(error)
      }
   }
}

module.exports = CategoriaController
