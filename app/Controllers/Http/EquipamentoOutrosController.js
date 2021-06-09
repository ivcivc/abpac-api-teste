'use strict'

const EquipamentoServices = use('App/Services/Equipamento')

const xmlToJson = require('xml2json')

class EquipamentoOutrosController {
   async getIDEndossos({ params, response }) {
      // recebe o idPrincipal

      try {
         const equipamentos = await new EquipamentoServices().getEndossos(
            params.id
         )

         return equipamentos
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async endosso({ request, response, auth }) {
      const payload = request.all()

      console.log('endosso...................')

      try {
         const equipamento = await new EquipamentoServices().endosso(
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

   async xmlToJson({ request }) {
      try {
         const xml = request.all()
         return xmlToJson.toJson(xml)
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }
}

module.exports = EquipamentoOutrosController
