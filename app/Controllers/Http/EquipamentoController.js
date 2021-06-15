'use strict'

const EquipamentoServices = use('App/Services/Equipamento')
const Database = use('Database')

/**
 * Resourceful controller for interacting with equipamentos
 */
class EquipamentoController {
   async store({ request, response, auth }) {
      const payload = request.all()

      try {
         const equipamento = await new EquipamentoServices().add(
            payload,
            null,
            auth
         )

         response.status(200).send({ type: true, data: equipamento })
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   /*async getAllRestricao({ request, response }) {
      try {
         const service = await new EquipamentoServices().getAllRestricao()

         response.status(200).send({ type: true, data: service })
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }*/

   async totalAtivos({ request, response, auth }) {
      const payload = request.all()

      try {
         const service = await new EquipamentoServices().totalAtivos(
            payload,
            null,
            auth
         )
         response.status(200).send(service)
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }

   async update({ request, params, response, auth }) {
      const payload = request.all()
      const ID = params.id

      //let trx = null

      try {
         //let trx = await Database.beginTransaction()

         const equipamento = await new EquipamentoServices().update(
            ID,
            payload,
            null,
            auth
         )
         let xx = 222
         /*await trx.commit()

         let xx= 222

         await equipamento.reload()
         await equipamento.load('equipamentoStatuses')
         await equipamento.load('pessoa')
         await equipamento.load('equipamentoProtecoes')*/

         response.status(200).send({ type: true, data: equipamento })
      } catch (error) {
         //await trx.rollback()
         console.log(error)
         response.status(400).send(error)
      }
   }

   async show({ params, response }) {
      try {
         const equipamento = await new EquipamentoServices().get(params.id)

         response.status(200).send({ type: true, data: equipamento })
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
         const equipamento = await new EquipamentoServices().index()

         response.status(200).send({ type: true, data: equipamento })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async localizarPor({ response, request }) {
      try {
         const payload = request.all()

         const equipamento = await new EquipamentoServices().localizarPor(
            payload
         )

         response.status(200).send({ type: true, data: equipamento })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async localizarBeneficioPorModelo({ response, request }) {
      try {
         const payload = request.all()

         const equipamento = await new EquipamentoServices().localizarBeneficioPorModelo(
            payload.modelo
         )

         response.status(200).send({ type: true, data: equipamento })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async localizarEquipaPorAssist24h({ response, request }) {
      try {
         const payload = request.all()

         const equipamento = await new EquipamentoServices().localizarEquipaPorAssist24h(
            payload
         )

         response.status(200).send({ type: true, data: equipamento })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async buscarProtecoes({ request, response }) {
      const payload = request.all()

      try {
         const equipamento = await new EquipamentoServices().buscarProtecoes(
            payload
         )

         response.status(200).send({ type: true, data: equipamento })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async buscarBeneficios({ request, response }) {
      const payload = request.all()

      try {
         const equipamento = await new EquipamentoServices().buscarBeneficios(
            payload
         )

         response.status(200).send({ type: true, data: equipamento })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async locBaixarTodosEquipamentos({ params, response }) {
      const payload = params.pessoa_id

      try {
         const equipamento = await new EquipamentoServices().locBaixarTodosEquipamentos(
            payload
         )

         response.status(200).send({ type: true, data: equipamento })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async endossoBaixarTodosEquipamentos({ request, response, auth }) {
      const payload = request.all()

      try {
         const service = await new EquipamentoServices().endossoBaixarTodosEquipamentos(
            payload,
            auth
         )

         response.status(200).send({ type: true, data: service })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async localizarPorCategoria({ request, response }) {
      const {categoria} = request.only('categoria')

      try {
         const service = await new EquipamentoServices().localizarPorCategoria(categoria)

         response.status(200).send({ type: true, data: service })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async localizarPorSubCategoria({ params, response }) {
      const categoria_id = params.categoria_id

      try {
         const service = await new EquipamentoServices().localizarPorSubCategoria(categoria_id)

         response.status(200).send({ type: true, data: service })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }
      
}

module.exports = EquipamentoController
