'use strict'

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */

const OcorrenciaServices = use('App/Services/Ocorrencia')

/**
 * Resourceful controller for interacting with ocorrencias
 */
class OcorrenciaController {
   async store({ request, response, auth }) {
      const payload = request.all()

      try {
         payload.status = 'Aberto'

         const ocorrencia = await new OcorrenciaServices().add(
            payload,
            null,
            auth
         )

         response.status(200).send({ type: true, data: ocorrencia })
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async addTerceiro({ request, response, auth }) {
      const payload = request.all()

      try {
         const ocorrencia = await new OcorrenciaServices().addTerceiro(
            payload,
            null,
            auth
         )

         response.status(200).send({ type: true, data: ocorrencia })
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async update({ request, params, response, auth }) {
      const payload = request.all()
      const ID = params.id

      try {
         const ocorrencia = await new OcorrenciaServices().update(
            ID,
            payload,
            null,
            auth
         )

         response.status(200).send({ type: true, data: ocorrencia })
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async updateTerceiro({ request, params, response, auth }) {
      const payload = request.all()
      const ID = params.id

      try {
         const res = await new OcorrenciaServices().updateTerceiro(
            ID,
            payload,
            null,
            auth
         )

         response.status(200).send({ type: true, data: res })
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async show({ params, response }) {
      try {
         const ocorrencia = await new OcorrenciaServices().get(params.id)

         response.status(200).send({ type: true, data: ocorrencia })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async index({ response }) {
      try {
         const ocorrencia = await new OcorrenciaServices().index()

         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async localizar({ request, params, response, auth, trx }) {
      try {
         const filtro = request.all()
         const query = await new OcorrenciaServices().localizar(
            filtro,
            trx,
            auth
         )

         response.status(200).send(query)
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async localizarPor({ request, params, response, auth, trx }) {
      try {
         const filtro = request.all()
         const query = await new OcorrenciaServices().localizarPor(
            filtro,
            trx,
            auth
         )

         response.status(200).send(query)
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async destroyTerceiro({ params, response, auth }) {
      try {
         const del = await new OcorrenciaServices().destroyTerceiro(params.id)
         response.status(200).send({
            type: true,
            message: 'Registro excluido com sucesso',
            data: del,
         })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: 'Não foi possível excluir o registro selecionado',
            name: error.name,
         })
      }
   }
}

module.exports = OcorrenciaController
