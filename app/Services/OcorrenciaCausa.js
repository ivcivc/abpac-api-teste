"use strict";

const Model = use("App/Models/OcorrenciaCausa")


class OcorrenciaCausa {

   async add(data) {
      try {

        const causa = await Model.create(data);

        return causa;

      } catch (e) {
        throw e;
      }
    }

    async get(ID) {

      try {

        const causa = await Model.findOrFail(ID);

        return causa;
      } catch (e) {
        throw e;
      }
    }

    async index() {
     try {
        const causa = await Model.query().fetch();

        return causa;
      } catch (e) {
        throw e;
      }
    }

    async update(ID, data) {
      try {
        let causa = await Model.findOrFail(ID);

        causa.merge(data);

        await causa.save();

        return causa;
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


   async del(ID) {
      try {

         const causa = await Model.findOrFail(ID)
         await causa.delete()

         return causa;

      } catch (e) {
         throw e;
      }
   }

}


module.exports = OcorrenciaCausa;
