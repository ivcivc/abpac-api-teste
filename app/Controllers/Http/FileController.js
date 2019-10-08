'use strict'

const Env = use("Env");

const FileServices = use("App/Services/Storage");

const File = use('App/Models/File')
const Helpers = use('Helpers')

const fs = require('fs');
const getStream = use("get-stream")


require('es6-promise').polyfill();
const fetch = require('isomorphic-fetch'); // or another library of choice.
const Dropbox = require('dropbox').Dropbox;

/*const dropboxV2Api = require('dropbox-v2-api');

const dropbox = dropboxV2Api.authenticate({
   token: 'Oa8F7Dr5mzAAAAAAAAAAJE8si36xHjswCwFSnUdoX8JldODN6bVnmDURWzkoy5Qk'
})*/

const dbx = new Dropbox({ accessToken: 'Oa8F7Dr5mzAAAAAAAAAAJE8si36xHjswCwFSnUdoX8JldODN6bVnmDURWzkoy5Qk', fetch });


/**
 * Resourceful controller for interacting with files
 */
class FileController {

   async list ( { request}) {

      return new Promise( (resolve, reject) => {

         dbx.sharingGetSharedLinkFile({ url: 'id:vNe542VRdrAAAAAAAAAAZg' })
         .then(function (data) {
           fs.writeFile(data.name, data.fileBinary, 'binary', function (err) {
             if (err) { throw err; }
             console.log('File: ' + data.name + ' saved.');
             resolve( data.name)
           });
         })
         .catch(function (err) {
            reject( err)
           throw err;
         });

         /*dbx.filesListFolder({ path: '' })
         .then(function (response) {
         console.log(response);
         resolve( response)
         })
         .catch(function (err) {
         console.log(err);
         reject( err)
         });*/

      })



   }


   async delete ({ request, response }) {

      const {path} = request.all()

      console.log('path ', path)

      return new Promise((resolve, reject)  => {

         dbx.filesDelete ({ path: path })

         .then(function (data) {

             resolve(data)

           })

         .catch(function (err) {
            reject( err)
           throw err;
         });
      })

   }

   async linkTemp ({ request, response }) {

      const {path} = request.all()

      console.log('path ', path)

      return new Promise((resolve, reject)  => {

         dbx.filesGetTemporaryLink({ path: path })

         .then(function (data) {

             resolve(data)

           })

         .catch(function (err) {
            reject( err)
           throw err;
         });
      })

   }

   async thumbnail ({ request, response }) {

      const {path, mode, size} = request.all()

      console.log('path ', path)

      return new Promise((resolve, reject)  => {

         dbx.filesGetTemporaryLink({ path: path, mode, size })

         .then(function (data) {

             resolve(data)

           })

         .catch(function (err) {
            reject( err)
           throw err;
         });
      })

   }


   async preview ({ request, response }) {

      const {path} = request.all()

      console.log('path ', path)

      return new Promise((resolve, reject)  => {

         dbx.filesGetPreview ({ path: path })

         .then(function (data) {

             resolve(data)

           })

         .catch(function (err) {
            reject( err)
           throw err;
         });
      })

   }

   async store ({ request, response, params }) {

      return new Promise((resolve, reject)  => {

         try {

            const query = request.get()

            let payload= JSON.parse(query.payload)

            request.multipart.file('file', {}, async (file) => {
               const fileName= `${Date.now()}.${file.extname}`
               const fileOriginal= file.clientName

               const fileContent = await getStream.buffer(file.stream);

               dbx.filesUpload({path: '/' + fileName, contents: fileContent})

               .then( async response => {
                  const fileModel = await File.create({
                     file: fileName,
                     name: fileOriginal,
                     path: response.path_lower,
                     type: file.type,
                     subtype: file.subtype,
                     fileId: response.id,
                     modulo: payload.modulo,
                     grupo: payload.grupo,
                     idParent: payload.idParent,
                     descricao: payload.descricao,
                     dVencimento: payload.dVencimento,
                     status: 'Ativo'
                  })

                  resolve(fileModel)
               })
               .catch(function(error) {
                  reject(error)
               });

            })

            request.multipart.process()


         } catch(err) {
            return response.status(err.status).send( { err: err.message, error: { message: 'Erro no upload de arquivo'}})
         }

      })


   }

   async update ({ request, response,params }) {

      const payload = request.all();
      const ID = params.id

      try {
        const file = await new FileServices().update(ID, payload, null);

        response.status(200).send({ type: true, data: file });
      } catch (error) {
        console.log(error);
        response.status(400).send(error);
      }

   }

}

module.exports = FileController
