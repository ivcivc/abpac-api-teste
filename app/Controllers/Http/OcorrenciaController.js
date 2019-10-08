'use strict'

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */

const OcorrenciaServices = use("App/Services/Ocorrencia");


/**
 * Resourceful controller for interacting with ocorrencias
 */
class OcorrenciaController {

   async store({ request, response, auth }) {
      const payload = request.all();

      try {

        payload.status= "Aberto"

        const ocorrencia = await new OcorrenciaServices().add(payload, null, auth);

        response.status(200).send({ type: true, data: ocorrencia });
      } catch (error) {
        console.log(error);
        response.status(400).send(error);
      }
    }

    async update({ request, params, response }) {
     const payload = request.all();
     const ID = params.id

     try {
       const ocorrencia = await new OcorrenciaServices().update(ID, payload, null);

       response.status(200).send({ type: true, data: ocorrencia });
     } catch (error) {
       console.log(error);
       response.status(400).send(error);
     }
    }

    async show({ params, response }) {

      try {
       const ocorrencia = await new OcorrenciaServices().get(params.id);

       response.status(200).send({ type: true, data: ocorrencia });
     } catch (error) {
       console.log(error);
       response.status(400).send({code: error.code, message: error.message, name: error.name});
     }
   }

   async index({ response }) {

     try {
       const ocorrencia = await new OcorrenciaServices().index();


       response.status(200).send({ type: true, data: ocorrencia });
     } catch (error) {
       console.log(error);
       response.status(400).send({code: error.code, message: error.message, name: error.name});
     }
   }

}

module.exports = OcorrenciaController
