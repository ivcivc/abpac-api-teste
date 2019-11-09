'use strict'

const Services = use("App/Services/BloqueadorLocalizador");


class BloqueadorLocalizadorController {
   async index ({response}) {
      try {
         const config = await new Services().index();

         response.status(200).send({ type: true, data: config });
      } catch (error) {

         response.status(400).send({code: error.code, message: error.message, name: error.name});
      }
  }


  async store ({ request, response }) {

      const payload = request.all();

      payload['status']= "Ativo"


      try {
         const config = await new Services().add(payload);

         response.status(200).send({ type: true, data: config });
      } catch (error) {
         response.status(400).send(error);
      }
  }


  async show ({ params, response }) {
      try {
         const config = await new Services().get(params.id);

         response.status(200).send({ type: true, data: config });
      } catch (error) {
         console.log(error);
         response.status(400).send({code: error.code, message: error.message, name: error.name});
      }
  }


  async update ({ params, request, response }) {
      const payload = request.all();
      const ID = params.id

      try {
         const config = await new Services().update(ID, payload);

         response.status(200).send({ type: true, data: config });
      } catch (error) {
         response.status(400).send(error);
      }
  }

  async destroy ({ params, request, response }) {
  }

}

module.exports = BloqueadorLocalizadorController
