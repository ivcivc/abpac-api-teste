"use strict";

const Env = use("Env");
const File = use('App/Models/File')
const Database = use('Database')

class Storage {

   async update(ID, data, trx) {
      try {
        let file = await File.findOrFail(ID);

        if ( !data.updateStatus)  {
           delete data['status']
           delete data['file']
        }

        file.merge(data);

        await file.save(trx ? trx : null);

        return file;
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


module.exports = Storage;
