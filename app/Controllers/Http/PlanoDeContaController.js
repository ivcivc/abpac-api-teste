'use strict'

const PlanoDeContaServices = use("App/Services/PlanoDeConta");

/**
 * Resourceful controller for interacting with plonocontas
 */
class PlanoDeContaController {

  async index ({ response }) {
   try {
      const planoConta = await new PlanoDeContaServices().index();

      response.status(200).send({ type: true, data: planoConta });
   } catch (error) {

      response.status(400).send({code: error.code, message: error.message, name: error.name});
   }
  }

  async store ({ request, response }) {
      const payload = request.all();

      payload['status']= "Ativo"

      try {
      const planoConta = await new PlanoDeContaServices().add(payload);

      response.status(200).send({ type: true, data: planoConta });
      } catch (error) {
         response.status(400).send(error);
      }
  }

  async show ({ params, response }) {
      try {

         let planoConta= null

         if ( params.id === 'combo') {
            planoConta = await new PlanoDeContaServices().getCombo();
         } else {
            planoConta = await new PlanoDeContaServices().get(params.id);
         }

         response.status(200).send({ type: true, data: planoConta });
      } catch (error) {
         console.log(error);
         response.status(400).send({code: error.code, message: error.message, name: error.name});
      }
  }

  async update ({ params, request, response }) {
      const payload = request.all();
      const ID = params.id
console.log('payload ', payload)
      try {
      const planoConta = await new PlanoDeContaServices().update(ID, payload);

      response.status(200).send({ type: true, data: planoConta });
      } catch (error) {
         response.status(400).send(error);
      }
  }

  async destroy ({ params, response }) {
      const ID = params.id

      try {
      const planoConta = await new PlanoDeContaServices().destroy(ID);

      response.status(200).send({ type: true, data: planoConta });
      } catch (error) {
         response.status(400).send(error);
      }
  }
}

module.exports = PlanoDeContaController
