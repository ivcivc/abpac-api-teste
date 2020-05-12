"use strict";

const Model = use("App/Models/EquipamentoBeneficio")
const ModelStatus = use('App/Models/EquipamentoBeneficioStatus')
const lodash = require('lodash')

const moment = require('moment')

class EquipamentoBeneficio {

   async add(data, trx, auth) {
      try {

         const model = await Model.create(data, trx ? trx : null);

         // status beneficio
         const status = {equipamento_beneficio_id: model.id, user_id: auth.user.id, motivo: "Inclusão de registro", status: model.status}
         await ModelStatus.create(status, trx ? trx : null)

         //await model.load('beneficio')

         return model;

      } catch (e) {
         throw e;
      }
    }

    async get(ID) {

      try {

        const model = await Model.findOrFail(ID);
        return model;
      } catch (e) {
        throw e;
      }
    }

    async index() {
     try {
        const model = await Model.query().with('equipamentoBeneficioStatuses').fetch();


        return model;
      } catch (e) {
        throw e;
      }
    }

    async update(ID, data, trx, auth) {
      try {
        let model = await Model.findOrFail(ID);

        let oStatus= null

        if ( model.status !== data.status) {
            const dTermino= lodash.isEmpty(model.dTermino) ? '' : ' Termino: ' + moment(model.dTermino, 'DD-MM-YYYY').toISOString().substr(0,10)
            const dTerminoNovo= lodash.isEmpty(data.dTermino) ? '' : ' Termino: ' + data.dTermino.substr(0,10)
            const dInicioModel= moment(model.dInicio, 'DD-MM-YYYY').toISOString().substr(0,10)
            let m= `Para: Status:${data.status} Entrada: ${data.dInicio.substr(0,10)} ${dTerminoNovo}`
            oStatus= {equipamento_beneficio_id: model.id, user_id: auth.user.id, motivo: `De: Status:${model.status} Entrada: ${dInicioModel} ${dTermino} - ${m}`, status: data.status}
        }


        model.merge(data);

        await model.save(trx ? trx : null);

        if ( oStatus ) {
          await ModelStatus.create(oStatus, trx ? trx : null)
        }



        return model;
      } catch (e) {
        throw {
          message: e.message,
          sqlMessage: e.sqlMessage,
          sqlState: e.sqlState,
          errno: e.errno,
          code: e.code
        };
      }
    }

    async del(ID, trx) {

      return new Promise(async (resolve, reject) => {

         try {

            const model = await Model.findOrFail(ID)

            await model
            .equipamentoBeneficioStatuses()
            .where('equipamento_beneficio_id', ID)
            //.transacting(trx ? trx : null)
            .delete()

            await model.delete(trx ? trx : null)

            resolve(model)

         } catch (e) {
            reject(e)
         }
      })

   }


}


module.exports = EquipamentoBeneficio;
