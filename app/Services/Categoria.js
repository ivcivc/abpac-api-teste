"use strict";

const Model = use("App/Models/Categoria")

const Database = use('Database')

class Categoria {

   async add(data) {
      try {

        const categoria = await Model.create(data);

        return categoria;

      } catch (e) {
        throw e;
      }
    }

    async get(ID) {

      try {

        const categoria = await Model.findOrFail(ID);

        return categoria;
      } catch (e) {
        throw e;
      }
    }

    async index() {
     try {
        const categoria = await Model.query().fetch();

        return categoria;
      } catch (e) {
        throw e;
      }
    }

    async update(ID, data) {
      try {
        let categoria = await Model.findOrFail(ID);

        categoria.merge(data);

        await categoria.save();

        return categoria;
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

         const categoria = await Model.findOrFail(ID)
         await categoria.delete()

         return categoria;

      } catch (e) {
         throw e;
      }
   }


}


module.exports = Categoria;
