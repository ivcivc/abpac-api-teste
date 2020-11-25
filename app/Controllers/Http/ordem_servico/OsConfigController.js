'use strict'

const Services = use("App/Services/OSConfig");


class OsConfigController {

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
         throw error
         //response.status(400).send(error);
      }
  }


  async show ({ params, response }) {
      try {
         const config = await new Services().get(params.id);

         response.status(200).send({ type: true, data: config });
      } catch (error) {
         throw error
         //console.log(error);
         //response.status(400).send({code: error.code, message: error.message, name: error.name});
      }
  }


  async update ({ params, request, response }) {
      const payload = request.all();
      const ID = params.id

      try {
         const config = await new Services().update(ID, payload);

         response.status(200).send({ type: true, data: config });
      } catch (error) {
         //response.status(400).send(error);
         throw error
      }
  }

  async destroy ({ params, request, response }) {
      try {
         const config = await new Services().delete(params.id);

         response.status(200).send({ type: true, message: "Excluído com sucesso!"});
      } catch (error) {
         throw error
         //console.log(error);
         //response.status(400).send({code: error.code, message: error.message, name: error.name});
      }
  }

}

module.exports = OsConfigController
