'use strict'

const EquipamentoServices = use("App/Services/Equipamento");

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */

/**
 * Resourceful controller for interacting with equipamentos
 */
class EquipamentoController {

   async store({ request, response, auth }) {
      const payload = request.all();

      try {

        const equipamento = await new EquipamentoServices().add(payload, null, auth);

        response.status(200).send({ type: true, data: equipamento });
      } catch (error) {
        console.log(error);
        response.status(400).send(error);
      }
    }

    async update({ request, params, response }) {
     const payload = request.all();
     const ID = params.id

     try {
       const equipamento = await new EquipamentoServices().update(ID, payload, null);

       response.status(200).send({ type: true, data: equipamento });
     } catch (error) {
       console.log(error);
       response.status(400).send(error);
     }
    }

    async show({ params, response }) {

      try {
       const equipamento = await new EquipamentoServices().get(params.id);

       response.status(200).send({ type: true, data: equipamento });
     } catch (error) {
       console.log(error);
       response.status(400).send({code: error.code, message: error.message, name: error.name});
     }
   }

   async index({ response }) {

     try {
       const equipamento = await new EquipamentoServices().index();

       response.status(200).send({ type: true, data: equipamento });
     } catch (error) {
       console.log(error);
       response.status(400).send({code: error.code, message: error.message, name: error.name});
     }
   }

}

module.exports = EquipamentoController
