'use strict'
const Services = use('App/Services/PendenciaSetup')


class PendenciaSetupController {

   async index ({ request, response}) {
      try {
         const model = await new Services().index();

         //await model.load('equipamentoBeneficioStatuses')

         response.status(200).send({ type: true, data: model });
      } catch (error) {

         response.status(400).send({code: error.code, message: error.message, name: error.name});
      }
     }

     async store ({ request, response }) {
         const payload = request.all();

         try {

            const model = await new Services().add(payload);

            //await trx.commit()

            //await model.load('beneficio')

            response.status(200).send({ type: true, data: model });
         } catch (error) {
            response.status(400).send(error);
         }
     }

     async show ({ params, response }) {
         try {
            const model = await new Services().get(params.id);

            response.status(200).send({ type: true, data: model });
         } catch (error) {
            console.log(error);
            response.status(400).send({code: error.code, message: error.message, name: error.name});
         }
     }

     async update ({ params, request, response }) {
         const payload = request.all();
         const ID = params.id

         try {
            const model = await new Services().update(ID, payload);

            response.status(200).send({ type: true, data: model });
         } catch (error) {
            //await trx.rollback()
            response.status(400).send(error);
         }
     }

     async destroy ({ params, request, response }) {
     }
}

module.exports = PendenciaSetupController
