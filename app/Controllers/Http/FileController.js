'use strict'

const Env = use("Env");

const Database = use('Database')

const FileServices = use("App/Services/Storage");

const File = use('App/Models/File')
const FileItem = use('App/Models/FileItem')

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

const dbx = new Dropbox({ accessToken: 'Oa8F7Dr5mzAAAAAAAAAAdCtu2ZHPDca4bFFIBz_uuRhcTRoXHRjtf_CZJqz7rOPp', fetch });

const lodash = require('lodash')
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

      const {id} = request.all()

      console.log('path ', id)

      let item= null

      try {
         item= await FileItem.findOrFail(id)

         return new Promise((resolve, reject)  => {

            dbx.filesGetTemporaryLink({ path: item.key })

            .then(function (data) {

               data.type= item.type
               data.subtype= item.subtype

               resolve(data)

            })

            .catch(function (err) {
               reject( err)
            throw err;
            });
         })


      } catch(e) {
         response.status(400).send(e)
      }


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

   // Upload de arquivo no dropbox
   async upload_file ({ request, response, params }) {

      return new Promise((resolve, reject)  => {

         try {

            const query = request.get()

            let payload= query

            if ( !lodash.isObject) {
               payload= JSON.parse(query.payload)
            }

            request.multipart.file('upload', {}, async (file) => {
               const fileName= `${Date.now()}.${file.extname}`
               const fileOriginal= file.clientName

               console.log('arquivo: ', fileName)

               const fileContent = await getStream.buffer(file.stream);

               dbx.filesUpload({path: '/' + fileName, contents: fileContent})

               .then( async response => {

                  const fileModelItem = await FileItem.create({
                     file: fileName,
                     name: fileOriginal,
                     path: response.path_lower,
                     type: file.type,
                     subtype: file.subtype,
                     key: response.id,
                     status: 'Aprovado'
                  })

                  resolve({arquivo: fileName, value: fileModelItem.id, status: "server"})
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

   /*
      Recebe o cabeçalho do File e grava a referencia id (file_id)
      no filho (fileItem - referencia dropbox)
   */
   async store({request,response}) {
      let {files} = request.only('files')
      let payload = request.all()


      let arrFiles= []
      let trx= null

      try {

         if (files) {
            arrFiles= files.split(',')
         }

         trx = await Database.beginTransaction()

         let status= "Concluído"

         if ( arrFiles.length === 0 ) {
            status= 'Pendente'
         }

         const fileModelItem = await File.create({
            modulo: payload.modulo,
            descricao: payload.descricao,
            dVencimento: payload.dVencimento,
            idParent: payload.idParent,
            pessoa_id: payload.pessoa_id,
            status
         }, trx)

         for (let value of arrFiles) {
            const item = await FileItem.findOrFail(value)
            item.merge({ file_id : fileModelItem.id})
            await item.save(trx)
         }

         await trx.commit()

         return response.status(200).send( {status: "server", id: fileModelItem.id })

       } catch (e) {
          await trx.rollback()
         throw e;
       }

   }

   async update ({ request, response,params }) {

      let trx= null

      const payload = request.all();
      const ID = params.id
      let items= payload.FileItems
      if ( items ) {
         items= JSON.parse(items)
      }

      payload.FileItems= items

      try {

         trx = await Database.beginTransaction()

         const file = await new FileServices().update(ID, payload, trx);

         await trx.commit()

         response.status(200).send({ type: true, data: file });
      } catch (error) {
         await trx.rollback()
         console.log(error);
         response.status(400).send(error);
      }

   }

   async store_oroginal ({ request, response, params }) {

      return new Promise((resolve, reject)  => {

         try {

            const query = request.get()

            let payload= query

            if ( !lodash.isObject) {
               payload= JSON.parse(query.payload)
            }


            console.log('store ', payload)

            request.multipart.file('upload', {}, async (file) => {
               const fileName= `${Date.now()}.${file.extname}`
               const fileOriginal= file.clientName

               console.log('arquivo: ', fileName)

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

   async index({  response, request }) {

      const {modulo}= request.only('modulo')
      const {idParent}= request.only('idParent')


      try {
         const file = File.query()

         if ( modulo) {
            file.where("modulo", "like", modulo)
         }

         if ( idParent) {
            file.where("idParent", "=", idParent)
         }


         const res= await file.fetch()

         response.status(200).send(res)

       } catch (error) {
        response.status(400).send({code: error.code, message: error.message, name: error.name});

       }
    }

   async busca({response,request}) {

      const payload = request.all()

      let modulo = ""

      if ( payload.modulo) {
         modulo = payload.modulo
      }

      try {

         let status = !payload.status ? null : payload.status.split(',')

         /*const query = await File
            .query()
            .select('*')
            .with('pessoa')
            //.with('equipamentos')
            //.with('equipamentos.ocorrencias')
            .fetch()*/

         let query = null

         if ( lodash.isEmpty(modulo)) {

            query = await Database
               .select(['files.id','files.descricao','files.modulo','files.status','files.idParent', 'files.pessoa_id','files.dVencimento', 'files.created_at', 'nome'])
               .from('files')
               .whereIn('files.status', status)
               .leftOuterJoin('pessoas', 'files.pessoa_id', 'pessoas.id') //.where('pessoas.modulo', 'Associado')
               .orderBy(['pessoas.nome', 'files.modulo'])


         } else {
            query = await Database
               .select(['files.id','files.descricao','files.modulo','files.status','files.idParent', 'files.pessoa_id','files.dVencimento', 'files.created_at', 'nome'])
               .from('files')
               .whereIn('files.status', status)
               .where('files.modulo', "like","%"+modulo+"%")
               .leftOuterJoin('pessoas', 'files.pessoa_id', 'pessoas.id') //.where('pessoas.modulo', 'Associado')
               .orderBy(['pessoas.nome', 'files.modulo'])

         }


         response.status(200).send({ type: true, data: query });
      } catch (error) {
         console.log(error);
         response.status(400).send(error);
      }
   }

}

module.exports = FileController
