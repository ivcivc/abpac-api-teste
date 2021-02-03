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

   Route.get('/pessoa/IsCpfCnpj/:cpfCnpj', 'PessoaController.isCpfCnpj').middleware([
      'auth'
   ])

   Route.get('/fornecedor/IsCpfCnpj/:cpfCnpj', 'PessoaController.isCpfCnpjFornecedor').middleware([
      'auth'
   ])

   Route.post('/localizar', 'LocalizarController.proxy')

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

   Route.post('/categoria/ordenar', 'CategoriaController.ordenar').middleware([
      'auth'
     ])


   Route.resource('/categoria', 'CategoriaController').middleware([
      'auth'
     ])

   Route.resource('/os_config', 'ordem_servico/OsConfigController').middleware([
      'auth'
     ]).validator( new Map([ [['/os_config.store'], ['ordem_servico/os_config']],
      [['/os_config.update'], ['ordem_servico/os_config']]]))


   Route.resource('/equipamentos', 'EquipamentoController').middleware([
      'auth'
   ])

   Route.post('/equipamentos/localizarPor', 'EquipamentoController.localizarPor').middleware([
      'auth'
   ])
   Route.post('/equipamentos/localizarEquipaPorAssist24h', 'EquipamentoController.localizarEquipaPorAssist24h').middleware([
      'auth'
   ])

   Route.post('/equipamentos/buscarProtecoes', 'EquipamentoController.buscarProtecoes')
   Route.post('/equipamentos/buscarBeneficios', 'EquipamentoController.buscarBeneficios')

   Route.post('/equipamento/endosso', 'EquipamentoOutrosController.endosso').middleware([
      'auth'
   ])
   Route.get('/equipamentos/getIDEndossos/:id', 'EquipamentoOutrosController.getIDEndossos').middleware([
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

   Route.post('/ocorrencias/localizar', 'OcorrenciaController.localizar').middleware([
      'auth'
   ])

   Route.post('/ocorrencias/addTerceiro', 'OcorrenciaController.addTerceiro').middleware([
      'auth'
   ])

   Route.delete('/ocorrencias/deleteTerceiro/:id', 'OcorrenciaController.destroyTerceiro').middleware([
      'auth'
   ])

   Route.put('/ocorrencias/updateTerceiro/:id', 'OcorrenciaController.updateTerceiro').middleware([
      'auth'
   ])

   Route.resource('/ocorrenciaStatus', 'OcorrenciaStatusController').middleware([
      'auth'
     ])

   Route.resource('/ocorrenciaCausa', 'OcorrenciaCausaController')
   //.middleware(['auth'])

   Route.resource('/lancamento', 'LancamentoController').middleware([
      'auth'
     ])
   Route.post('/lancamento/localizarPor', 'LancamentoController.localizarPor').middleware([
      'auth'
     ])
   Route.post('/lancamento/cancelar', 'LancamentoController.cancelar').middleware([
      'auth'
     ])
   Route.post('/lancamento/reverter-cancelamento', 'LancamentoController.reverter_cancelamento').middleware([
      'auth'
     ])
   Route.post('/lancamento/inadimplente', 'LancamentoController.inadimplente').middleware([
      'auth'
     ])
   Route.post('/lancamento/reverter_inadimplente', 'LancamentoController.reverter_inadimplente').middleware([
      'auth'
     ])
   Route.post('/lancamento/cancelar_compensacao', 'LancamentoController.cancelar_compensacao').middleware([
      'auth'
     ])

   Route.post('/lancamento/acordo', 'LancamentoController.acordo').middleware([
      'auth'
     ])
   Route.post('/lancamento/gerarLancamentos', 'LancamentoController.gerarLancamentos').middleware([
      'auth'
     ])
   Route.resource('/lancamentoConfig', 'LancamentoConfigController').middleware([
      'auth'
     ])

   Route.post('/lancamento/destroyOS', 'LancamentoController.destroyOS').middleware([
      'auth'
     ])

   /*Route.resource('/rateio', 'RateioController').middleware([
      'auth'
     ])*/


   Route.get('/rateio/statusEmailMassa/:boleto_id', 'RateioController.statusEmailMassa').middleware([
      'auth'
     ])

     Route.get('/rateio/auth', 'RateioController.auth')

    Route.get('/rateio/callback', 'RateioController.callback')


   Route.post('/rateio/dispararEmailMassa', 'RateioController.dispararEmailMassa').middleware([
      'auth'
     ])

     Route.get('/rateio/localizarEmailMassa/:id', 'RateioController.localizarEmailMassa').middleware([
      'auth'
     ])

   Route.get('/rateio/equipamentosAtivos', 'RateioController.equipamentosAtivos').middleware([
      'auth'
     ])

   Route.get('/rateio/lista_os', 'RateioController.lista_os').middleware([
      'auth'
     ])

   Route.get('/rateio/inadimplentes', 'RateioController.inadimplentes').middleware([
      'auth'
     ])

   Route.post('/rateio', 'RateioController.store').middleware([
      'auth'
     ])

   Route.post('/rateio/simulador', 'RateioController.simulador').middleware([
   'auth'
   ])

   Route.post('/rateio/simulador', 'RateioController.simulador').middleware([
   'auth'
   ])

   Route.post('/rateio/lista_equipamentos', 'RateioController.PDF_TodosEquipamentosRateioPorPessoa').middleware([
      'auth'
      ])
   Route.get('/rateio/equipamentoPreviewPDF/:id', 'RateioController.equipamentoPreviewPDF')


   Route.get('/rateio/ocorrenciaPreviewPDF/:id', 'RateioController.ocorrenciaPreviewPDF')

   Route.post('/rateio/lista_ocorrencias', 'RateioController.PDF_RateioRelatorioOcorrencias').middleware([
      'auth'
      ])

      Route.get('/rateio/:id', 'RateioController.show').middleware([
         'auth'
         ])

   Route.get('/rateio', 'RateioController.index').middleware([
         'auth'
         ])

   Route.post('/rateio/config', 'RateioController.config').middleware([
            'auth'
            ])

   Route.post('/rateio/addOrUpdateConfig', 'RateioController.addOrUpdateConfig').middleware([
               'auth'
               ])

   Route.put('/rateio/:id', 'RateioController.update').middleware([
            'auth'
            ])

   Route.get('/rateio/gerarFinanceiroLoc/:id', 'RateioController.gerarFinanceiroLoc').middleware([
               'auth'
               ])

   Route.post('/rateio/gerarFinanceiro', 'RateioController.gerarFinanceiro').middleware([
      'auth'
      ])

   Route.resource('/planoConta', 'PlanoDeContaController')


  Route.get('/cnab/listarArquivosRemessa', 'CnabController.listarArquivosRemessa').middleware([
      'auth'
      ])

   Route.post('/cnab/downloadRemessa', 'CnabController.downloadRemessa').middleware([
         'auth'
         ])

   /*Route.post('/cnab/arquivarArquivoRemessa', 'CnabController.arquivarArquivoRemessa').middleware([
         'auth'
         ])*/

   Route.post('/cnab/localizarRemessaArquivado', 'CnabController.localizarArquivoRemessaArquivado').middleware([
      'auth'
      ])

   Route.post('/cnab/lerArquivoRetorno', 'CnabController.lerArquivoRetorno').middleware([
      'auth'
      ]) // 13-07-2020lerArquivoRetorno
   Route.post('/cnab/baixarArquivoRetorno', 'CnabController.baixarArquivoRetorno').middleware([
      'auth'
      ])
   Route.post('/cnab/localizarRetornoArquivado', 'CnabController.localizarRetornoArquivado').middleware([
         'auth'
         ])

   Route.get('/gerador', async (request, response) =>  {
      const PDFKit = use('pdfkit');
      const fs = use('fs');

      const pdf = new PDFKit();

      pdf.text('Hello Rocketseat PDF');

      pdf.pipe(fs.createWriteStream('output.pdf'));
      pdf.end();

      response.attachment(pdf);
   })

   Route.get('/lancamento/pdf/:boleto_id', 'LancamentoController.pdf')
   Route.get('/lancamento/pdfDownload/:arquivo', 'LancamentoController.pdfDownload')

   //Route.resource('/cnab', 'CnabController')


   Route.resource('/conta', 'ContaController').middleware([
      'auth'
     ])

   Route.resource('/beneficio', 'BeneficioController')


   Route.resource('/pendenciaSetup', 'PendenciaSetupController').middleware([
      'auth'
     ])

   Route.resource('/pendencia', 'PendenciaController').middleware([
      'auth'
   ])

   Route.resource('/ordemServico', 'ordem_servico/OrdemServicoController').middleware([
      'auth'
     ])

   Route.post('/ordemServico/localizarPor', 'ordem_servico/OrdemServicoController.localizarPor')


   Route.post('upload99', async ({ request }) => {

      request.multipart.file('file', {}, async (file) => {
         console.log('file ', file)
        await Drive.disk('s3').put(file.clientName, file.stream)
      })

      await request.multipart.process()
    })

   Route.resource('/fileConfig', 'FileConfigController')

   Route.put('/files/:id', 'StorageController.update')
   Route.post('/files', 'StorageController.store')
   Route.post('/upload', 'StorageController.upload') // 13-07-2020

  // Route.post('/upload', 'FileController.store')
  // Route.post('/upload_file', 'FileController.upload_file')
  // Route.put('/files/:id', 'FileController.update')
   Route.post('/list', 'FileController.list')
   Route.get('/file', 'FileController.index')
   Route.post('/controle/file', 'FileController.busca')

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

    Route.post('/converter', 'ConverterController.converter').middleware([
       'auth'
    ])

   /*Route.get('/filemanager/folders', 'GerenciadorArquivoController.folders')
   Route.get('/filemanager/files', 'GerenciadorArquivoController.files')
   Route.get('/filemanager/info', 'GerenciadorArquivoController.info')
   Route.get('/filemanager/preview', 'GerenciadorArquivoController.preview')
   Route.get('/filemanager/meta', 'GerenciadorArquivoController.meta')
   Route.get('/filemanager/direct', 'GerenciadorArquivoController.direct')
    */
}).prefix('api')

// middleware(['auth', 'is:(admin || manager')])
Route.post('/lucidql', 'LucidQlController.query').prefix('api')

require('./permission')

/*

.middleware(['auth', 'is:(administrador || moderador)'])
.except(['index','show'])

.middleware(['auth', 'can:(adicionar-cliente )'])

*/
