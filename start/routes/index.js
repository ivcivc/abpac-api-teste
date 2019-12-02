'use strict'

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */

const Route = use('Route')

const Drive = use('Drive')

Route.group(() => {

   Route.get('/', () => {
      return { message: 'Abpac Server' }
   })

   Route.resource('/pessoas', 'PessoaController').middleware([
      'auth'
   ]).validator( new Map([
      [['/pessoas.store'], ['Pessoa/Create']],
      ]))

   Route.resource('/fornecedores', 'FornecedorController').middleware([
      'auth'
   ]).validator( new Map([
      [['/pessoas.store'], ['Pessoa/Create']],
      ]))


   Route.resource('/pessoaStatus', 'PessoaStatusController').middleware([
    'auth'
   ])

   Route.get('/pessoaPasta/:id', 'PessoaPastaController.getPastaID').middleware([
      'auth'
   ])

   Route.resource('/categoria', 'CategoriaController').middleware([
      'auth'
     ])

     Route.resource('/os_config', 'OsConfigController').middleware([
      'auth'
     ])

   Route.resource('/equipamentos', 'EquipamentoController').middleware([
      'auth'
   ])

   Route.post('/equipamento/endosso', 'EquipamentoOutrosController.endosso').middleware([
      'auth'
   ])

   Route.post('/xmlToJson', 'EquipamentoOutrosController.xmlToJson').middleware([
      'auth'
   ])

   Route.resource('/equipamentoStatus', 'EquipamentoStatusController').middleware([
    'auth'
   ])

   Route.resource('/equipamentoProtecao', 'EquipamentoProtecaoController').middleware([
      'auth'
     ])

   Route.resource('/equipamentoProtecaoStatus', 'EquipamentoProtecaoStatusController').middleware([
      'auth'
     ])

   Route.resource('/equipamentoBeneficio', 'EquipamentoBeneficioController').middleware([
      'auth'
     ])


   Route.resource('/bloqueadorLocalizador', 'BloqueadorLocalizadorController').middleware([
      'auth'
     ])

   Route.resource('/ocorrencias', 'OcorrenciaController').middleware([
      'auth'
   ])
   Route.resource('/ocorrenciaStatus', 'OcorrenciaStatusController').middleware([
      'auth'
     ])

   Route.resource('/ocorrenciaCausa', 'OcorrenciaCausaController')
   //.middleware(['auth'])

   Route.resource('/planoConta', 'PlanoDeContaController')

   Route.resource('/beneficio', 'BeneficioController')

   Route.resource('/pendenciaSetup', 'PendenciaSetupController').middleware([
      'auth'
     ])

   Route.resource('/pendencia', 'PendenciaController').middleware([
      'auth'
   ])


   Route.post('upload99', async ({ request }) => {

      request.multipart.file('file', {}, async (file) => {
         console.log('file ', file)
        await Drive.disk('s3').put(file.clientName, file.stream)
      })

      await request.multipart.process()
    })

   Route.post('/upload', 'FileController.store')
   Route.put('/files/:id', 'FileController.update')
   Route.post('/list', 'FileController.list')

   Route.post('/delete', 'FileController.delete')
   Route.post('/preview', 'FileController.preview')
   Route.post('/linkTemp', 'FileController.linkTemp')
   Route.post('/thumbnail', 'FileController.thumbnail')

   Route.post('upload1', async ({ request }) => {

      var fetch = require('isomorphic-fetch'); // or another library of choice.
      var Dropbox = require('dropbox').Dropbox;
      var dbx = new Dropbox({ accessToken: 'Oa8F7Dr5mzAAAAAAAAAAJE8si36xHjswCwFSnUdoX8JldODN6bVnmDURWzkoy5Qk', fetch });

    let fileName= "teste"

      request.multipart.file('upload', {}, async (file) => {
         console.log('file ===== ', file)
         await dbx.filesUpload({path: '/' + fileName, contents: file.stream})
          /*.then(function(response) {
            console.log('resposta: ', response);
          })
          .catch(function(error) {
            console.error(error);
          });*/

        //await Drive.disk('s3').put(file.fileName, file.stream)
      })

      await request.multipart.process()
    })


    Route.post('/email', 'EmailController.enviar')


}).prefix('api')

// middleware(['auth', 'is:(admin || manager')])
Route.post('/lucidql', 'LucidQlController.query').prefix('api')

require('./permission')

/*

.middleware(['auth', 'is:(administrador || moderador)'])
.except(['index','show'])

.middleware(['auth', 'can:(adicionar-cliente )'])

*/
