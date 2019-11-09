"use strict";

const Model = use("App/Models/BloqueadorLocalizador")

class BloqueadorLocalizador {

   async add(data) {
      try {

        const config = await Model.create(data);

        return config;

      } catch (e) {
        throw e;
      }
    }

    async get(ID) {

      try {

        const config = await Model.findOrFail(ID);

        return config;
      } catch (e) {
        throw e;
      }
    }

    async index() {
     try {
        const config = await Model.query().fetch();

        return config;
      } catch (e) {
        throw e;
      }
    }

    async update(ID, data) {
      try {
        let config = await Model.findOrFail(ID);

        config.merge(data);

        await config.save();

        return config;
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


module.exports = BloqueadorLocalizador;
