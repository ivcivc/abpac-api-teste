'use strict'

const EquipamentoServices = use("App/Services/Equipamento");
const Database = use('Database')
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

    async update({ request, params, response, auth }) {
      const payload = request.all();
      const ID = params.id

      //let trx = null

      try {

         //let trx = await Database.beginTransaction()

         const equipamento = await new EquipamentoServices().update(ID, payload, null, auth);
         let xx= 222
         /*await trx.commit()

         let xx= 222

         await equipamento.reload()
         await equipamento.load('equipamentoStatuses')
         await equipamento.load('pessoa')
         await equipamento.load('equipamentoProtecoes')*/

         response.status(200).send({ type: true, data: equipamento });
      } catch (error) {
         //await trx.rollback()
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

   async buscarProtecoes({ request, response }) {

      const payload = request.all()

      try {
         const equipamento = await new EquipamentoServices().buscarProtecoes(payload);

         response.status(200).send({ type: true, data: equipamento });
      } catch (error) {
         console.log(error);
         response.status(400).send({code: error.code, message: error.message, name: error.name});
      }
   }

   async buscarBeneficios({ request, response }) {

      const payload = request.all()

      try {
         const equipamento = await new EquipamentoServices().buscarBeneficios(payload);

         response.status(200).send({ type: true, data: equipamento });
      } catch (error) {
         console.log(error);
         response.status(400).send({code: error.code, message: error.message, name: error.name});
      }
   }

}

module.exports = EquipamentoController
