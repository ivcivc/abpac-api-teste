'use strict'

const storageService = use("App/Services/Storage");

class StorageController {

   async upload({ request, response }) {
      const payload = request.all();

      let file= request._files

      const s= new storageService().upload(file)

      return s

   }
}

module.exports = StorageController
