"use strict";

const Model = use("App/Models/EquipamentoBeneficio")
const ModelStatus = use('App/Models/EquipamentoBeneficioStatus')
const lodash = require('lodash')

class EquipamentoBeneficio {

   async add(data, trx, auth) {
      try {

         const model = await Model.create(data, trx ? trx : null);

         // status beneficio
         const status = {equipamento_beneficio_id: model.id, user_id: auth.user.id, motivo: "Inclusão de registro", status: model.status}
         await ModelStatus.create(status, trx ? trx : null)

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
            const dTermino= lodash.isEmpty(model.dTermino) ? '' : ' Termino: ' + model.dTermino
            const dTerminoNovo= lodash.isEmpty(data.dTermino) ? '' : ' Termino: ' + data.dTermino
            let m= `Para: data.status Entrada: ${data.dEntrada} ${dTerminoNovo}`
            oStatus= {equipamento_beneficio_id: model.id, user_id: auth.user.id, motivo: `De: ${model.status} Entrada: ${model.dEntrada} ${dTermino} - ${m}`, status: model.status}
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


}


module.exports = EquipamentoBeneficio;
