'use strict'

const EquipamentoServices = use("App/Services/Equipamento");
const xmlToJson = require('xml2json');

class EquipamentoOutrosController {

   async endosso({ request, response, auth }) {
      const payload = request.all();

      try {

        const equipamento = await new EquipamentoServices().endosso(payload, null, auth);

        response.status(200).send({ type: true, data: equipamento });
      } catch (error) {
        console.log(error);
        response.status(400).send(error);
      }
    }

    async xmlToJson({request}) {

      try {
         const xml = request.all()
         return xmlToJson.toJson(xml);
      } catch (error) {
         console.log(error);
         response.status(400).send(error);
       }
   }


}

module.exports = EquipamentoOutrosController
