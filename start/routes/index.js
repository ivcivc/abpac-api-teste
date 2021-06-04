'use strict'

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */

const Route = use('Route')

const Drive = use('Drive')
const Helpers = use('Helpers')
const lodash = use('lodash')

Route.group(() => {

   Route.get('/view/:file/:tipo',async ({params, response}) => {
      try {
         const arquivo= params.file
         const tipo= params.tipo
         let pasta= ''
         if (tipo === 'o') {
            pasta = Helpers.tmpPath('rateio/ocorrencias/')
         }
         if (tipo === 'e') {
            pasta = Helpers.tmpPath('rateio/equipamentos/')
         }
         if (tipo === 'b') {
            pasta = Helpers.tmpPath('ACBr/pdf/')
         }

         if (arquivo) {
            let existe = await Drive.exists(pasta + arquivo)

            return response
               .header('Content-type', 'application/pdf')
               .download(pasta + arquivo)
         }
         return response.status(501)
      } catch (e) {
         console.log('PRINCIPAL ', e)
         response.status(200).send({ success: false, message: 'modulo principal ' + e.message })
      }

   })

   Route.get('/', () => {
      return { message: 'Abpac Server' }
   })

   Route.post('/myZap', ({request, response}) => {
      const o= request.all()
      console.log('------------ myZap ----------------')
      console.log(o)
      return { message: "Deu certo o webhook"}
   })

   Route.get('/myZap/start', async ({request, response}) => {
      const Zap= use('App/Services/Zap/MyZap')
      try {
         const r= await Zap().start()
         return response.send(r)
      } catch(e) {
         return response.status(400).send(e)
      }
   })

   Route.get('/myZap/close', async ({request, response}) => {
      const Zap= use('App/Services/Zap/MyZap')
      try {
         const r= await Zap().close()
         return response.send(r)
      } catch(e) {
         return response.status(400).send(e)
      }
   })


   Route.get('/myZap/status', async ({request, response}) => {
      const Zap= use('App/Services/Zap/MyZap')
      try {
         const r= await Zap().status()
         return response.send(r)
      } catch(e) {
         return response.status(400).send(e)
      }
   })

   Route.get('/myZap/test/:tel', async ({params, response}) => {
      const Zap= use('App/Services/Zap/MyZap')
      try {
         const r= await Zap().test(params.tel)

         return r // response.download(r)
      } catch(e) {
         return response.status(400).send(e)
      }
   })

   Route.get('/myZap/qrcode', async ({request, response}) => {
      const Zap= use('App/Services/Zap/MyZap')
      try {
         const r= await Zap().qrcode()
         if ( !lodash.isEmpty(r.qrcode)) {
            if ( r.qrcode.substr(0,4) !== 'data') {
               r.qrcode= 'data:image/png;base64,' + r.qrcode
            }
         }

         //console.log(r)
         response.header("Access-Control-Allow-Origin", "*");
         //response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
         //response.header('Content-Encoding', 'gzip')
         //response.header("content-length","7048")
         //response.header("content-type","image/png")

         const fs= require("fs");
         //const pasta = Helpers.publicPath('images/qrcode.png')
         //let bibi= fs.readFileSync(Helpers.publicPath('images/logo-abpac.png'), 'binary')
         console.log(r)
         //fs.writeFileSync(pasta, r.qrcode, 'base64')
         let bibi= fs.readFileSync(Helpers.publicPath('images/qrcode.png'), 'base64')

         //return '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'
         return response.send(r)
      } catch(e) {
         return response.status(400).send(pasta)
      }
   })

   Route.resource('/pessoas', 'PessoaController').middleware([
      'auth'
     ]).validator( new Map([
      [['/pessoas.store'], ['Pessoa/Create']]
      ]))

   Route.get('/pessoa/IsCpfCnpj/:cpfCnpj/:id', 'PessoaController.isCpfCnpj').middleware([
      'auth'
   ])

   Route.get('/fornecedor/IsCpfCnpj/:cpfCnpj/:id', 'PessoaController.isCpfCnpjFornecedor').middleware([
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

   /*Route.get('/restricao/getAllRestricao', 'EquipamentoController.getAllRestricao').middleware([
      'auth'
   ])*/

   Route.get('/converterRateio', 'RateioController.converterRateio')


   Route.resource('/restricao', 'RestricaoController').middleware([
      'auth'
     ])

   Route.get('/equipamentos/baixarTodosEquipamentos/:pessoa_id', 'EquipamentoController.locBaixarTodosEquipamentos').middleware([
      'auth'
   ])

   Route.post('/equipamentos/baixarTodosEquipamentos', 'EquipamentoController.endossoBaixarTodosEquipamentos').middleware([
      'auth'
   ])


   Route.post('/equipamentos/totalAtivos', 'EquipamentoController.totalAtivos')
   /*.middleware([
      'auth'
   ])*/

   Route.post('/equipamentos/localizarPor', 'EquipamentoController.localizarPor').middleware([
      'auth'
   ])
   Route.post('/equipamentos/localizarEquipaPorAssist24h', 'EquipamentoController.localizarEquipaPorAssist24h').middleware([
      'auth'
   ])

   Route.post('/equipamentos/buscarProtecoes', 'EquipamentoController.buscarProtecoes')
   Route.post('/equipamentos/buscarBeneficios', 'EquipamentoController.buscarBeneficios')
   Route.post('/equipamentos/buscarBaixas', 'EquipamentoController.buscarBaixas')

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

   Route.post('/ocorrencias/localizarPor', 'OcorrenciaController.localizarPor').middleware([
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

   Route.post('/lancamentoAddBoleto', 'LancamentoController.gerarBoleto').middleware([
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

   Route.get('/rateio/equipamentosAtivos/:dAdesao', 'RateioController.equipamentosAtivos').middleware([
      'auth'
     ])

     Route.get('/rateio/equipamentosDeBaixas/', 'RateioController.equipamentosDeBaixas').middleware([
      'auth'
     ])

     Route.get('/rateio/creditoBaixados/', 'RateioController.creditoBaixados').middleware([
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

   Route.get('/isPDFBusy', 'RateioController.isPDFBusy').middleware([
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
   Route.get('/tt',async ({response}) => {
      try {
         const lancamento = use('App/Models/Lancamento')
         const lanca= await lancamento.find(1)
         await lanca.load('conta')
         await lanca.load('pessoa')

         const factory= use('App/Services/Bank/Factory')
         let boleto= await factory().Boleto('sicoob')
         /*let res= await boleto.localizarBoleto({
            numeroContrato: 2554645,
            modalidade: 1,
            nossoNumero: '123',
            conta_id: 1
         })*/

         /*let res= await boleto.segundaVia({
            numeroContrato: 2554645,
            modalidade: 1,
            nossoNumero: '123',
            conta_id: 1
         })*/

         /*let res= await boleto.localizarPorPagador({
            numeroCpfCnpj: '87275090600',
            numeroContrato: '2554645',
            conta_id: 1
         })*/

         let res= await boleto.prorrogarDataVencimento({
            numeroContrato: '123455',
            modalidade: 1,
            dataVencimento: "2018-09-20T00:00:00-03:00",
            conta_id: 1
         })
         /*let res= await boleto.novoBoleto(lanca.toJSON(),{
            conta_id: 1
         })*/
         //let res= await boleto.localizarBoleto()

         return res
      } catch (error) {
         console.log('retornou erro raiz')
         console.log(error)
         return JSON.stringify(error)
      }

   })



   Route.get('/ti',async ({response}) => {
      try {
         //return { success: false, message: 'modulo principal ' }
         const factory= use('App/Services/Bank/Factory')
         let boleto= await factory().Boleto('sicoob')
         let res= await boleto.localizarBoleto()
         return res
      } catch (e) {
         console.log('PRINCIPAL ', e)
         response.status(200).send({ success: false, message: 'modulo principal ' + e.message })
      }

   })

   Route.get('/bank/callback',async ({response, request}) => {
      try {
         let Auth= use('App/Services/Bank/Sicoob/Auth')
         let res= request.all()
         return new Auth().callback(res)
      } catch (error) {
         return error
      }


   })

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
   Route.post('/lancamento/sendZapBoleto', 'LancamentoController.sendZapBoleto')
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
  // Route.post('/ordemServico/localizarOS', 'ordem_servico/OrdemServicoController.localizarOS')


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
   Route.get('/files/corregir', 'StorageController.corregir')


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
