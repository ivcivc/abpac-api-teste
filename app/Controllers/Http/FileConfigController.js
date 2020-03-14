'use strict'

const Env = use("Env");

const Database = use('Database')

const Model = use('App/Models/FileConfig')

class FileConfigController {

   async store({ request, response, auth }) {
      const payload = request.all();

      try {

        const model = await Model.create(payload)

        response.status(200).send({ type: true, data: model });
      } catch (error) {
        console.log(error);
        response.status(400).send(error);
      }
   }

   async update({ request, params, response }) {
      const descricao = request.only('descricao');
      const ID = params.id

      try {
        const model = await Model.findOrFail(ID)

        model.merge(descricao)

        await model.save()

        response.status(200).send({ type: true, data: model });
      } catch (error) {
        console.log(error);
        response.status(400).send(error);
      }
   }

   async show({ params, response, request }) {

      let page= request.only('page')
      let limit= request.only('limit')

      try {
        const model = await Model.findOrFail(params.id);

        response.status(200).send({ type: true, data: model });
      } catch (error) {
        console.log(error);
        response.status(400).send({code: error.code, message: error.message, name: error.name});
      }
    }

    async index({  response, request }) {

      const {modulo}= request.only('modulo')


      try {
         const model = Model.query()

         if ( modulo) {
            model.where("modulo", "like", modulo)
         }


         const res= await model.fetch()

         response.status(200).send(res)

       } catch (error) {
        response.status(400).send({code: error.code, message: error.message, name: error.name});

       }
    }


    async destroy({ params }) {

      const model = await Model.findOrFail(params.id)
      model.delete()
    }


}

module.exports = FileConfigController
