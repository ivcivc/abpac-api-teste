"use strict";

const Env = use("Env");
const File = use('App/Models/File')
const FileItem = use('App/Models/FileItem')
const Database = use('Database')

class Storage {

   async update(ID, data, trx) {
      try {
        let file = await File.findOrFail(ID);
        let items= data.FileItems
        delete data.FileItems

        let arr_files_id= []
        if (data.files) {
         arr_files_id= data.files.split(',')
      }

        delete data.files

        if ( !data.updateStatus)  {
           //delete data['status']
           delete data['file']
        }

        file.merge(data)

        if ( items) {
            items.forEach(e => {
               delete e.link
            })
            for (let e in items) {
               let x= 1
               await file
               //.transacting(trx)
               .FileItems()
               .where('id', items[e].id)
               .update(items[e])
            }
            //await file.FileItems().saveMany(items)
         }

        await file.save(trx ? trx : null);

        if (arr_files_id.length > 0 ) {

         for (let e in arr_files_id) {
            let itemId= arr_files_id[e]
            let itemModel = await FileItem.findOrFail(itemId)
            itemModel.merge({file_id: ID})
            await itemModel.save(trx ? trx : null);

         }
        }

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
