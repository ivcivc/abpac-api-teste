"use strict";

const Model = use("App/Models/Pendencia")
//const Pessoa= use("App/Models/Pessoa")

class Pendencia {

   async add(data, trx) {
      try {

        const model = await Model.create(data, trx ? trx : null);

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
        const model = await Model.query()
            //.with('pessoa')
            .fetch();

        return model;
      } catch (e) {
        throw e;
      }
    }

    async update(ID, data) {
      try {
        let model = await Model.findOrFail(ID);

        model.merge(data);

        await model.save();

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


module.exports = Pendencia;
