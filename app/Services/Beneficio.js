"use strict";

const Model = use("App/Models/Beneficio")

class Beneficio {

   async add(data) {
      try {

        const model = await Model.create(data);

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
        const model = await Model.query().fetch();

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

   async del(ID) {

      return new Promise(async (resolve, reject) => {

         try {

            const model = await Model.findOrFail(ID)
            await model.delete()

            resolve(model)

         } catch (e) {
            reject(e)
         }
      })

   }


}


module.exports = Beneficio;
