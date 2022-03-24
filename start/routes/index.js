'use strict'

const { RouteResource } = require('@adonisjs/framework/src/Route/Manager')
const SignController = require('../../app/Controllers/Http/SignController')

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */

const Route = use('Route')

const Drive = use('Drive')
const Helpers = use('Helpers')
const lodash = use('lodash')

Route.group(() => {

   /*Route.get('/web/:token',async ({params, response}) => {
      console.log('buscando token.')

      return { titulo: "Rateio de Junho/2021", dVencimento: "15/07/2022", link_boleto: 'https://abpac-app.com.br/api/view/boleto_3381.pdf/b',
      link_equipamento: 'https://abpac-app.com.br/api/view/equip_5_1843.pdf/e',
      link_ocorrencia: 'https://abpac-app.com.br/api/view/rateio_ocorrencias_5.pdf/o'
      }
   })*/

   Route.get('/web/:token','RateioController.exibirLinkRelatorioBoleto')

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
      ])).middleware([
         'versao'
      ])

   Route.get('/pessoa/IsCpfCnpj/:cpfCnpj/:id', 'PessoaController.isCpfCnpj').middleware([
      'auth'
   ])

   Route.get('/fornecedor/IsCpfCnpj/:cpfCnpj/:id', 'PessoaController.isCpfCnpjFornecedor').middleware([
      'auth'
   ])

   Route.post('/localizar', 'LocalizarController.proxy').middleware([
      'versao'
   ])

   Route.resource('/fornecedores', 'FornecedorController').middleware([
      'auth'
   ]).validator( new Map([
      [['/pessoas.store'], ['Pessoa/Create']],
      ])).middleware([
         'versao'
      ])


   Route.resource('/pessoaStatus', 'PessoaStatusController').middleware([
    'auth'
   ])

   Route.get('/pessoaPasta/:id', 'PessoaPastaController.getPastaID').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/categoria/ordenar', 'CategoriaController.ordenar').middleware([
      'auth'
     ])


   Route.resource('/categoria', 'CategoriaController').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])

   Route.resource('/os_config', 'ordem_servico/OsConfigController').middleware([
      'auth'
     ]).validator( new Map([ [['/os_config.store'], ['ordem_servico/os_config']],
      [['/os_config.update'], ['ordem_servico/os_config']]]))

   Route.resource('/equipamentos', 'EquipamentoController').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/equipamentos/localizarPorCategoria', 'EquipamentoController.localizarPorCategoria').middleware([
      'versao'
   ])
   Route.get('/equipamentos/localizarPorSubCategoria/:categoria_id', 'EquipamentoController.localizarPorSubCategoria').middleware([
      'versao'
   ])

   Route.post('/equipamentos/relatorio/adesao', 'EquipamentoController.relatorioAdesao').middleware([
      'auth'
     ])

     Route.post('/equipamentos/relatorio/cancelamento', 'EquipamentoController.relatorioBaixaCancelamento').middleware([
      'auth'
     ])

   /*Route.get('/restricao/getAllRestricao', 'EquipamentoController.getAllRestricao').middleware([
      'auth'
   ])*/

   Route.get('/converterRateio', 'RateioController.converterRateio')


   Route.resource('/restricao', 'RestricaoController').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])

   Route.post('/equipamentos/relatorioEquipamentoBeneficioAtivo', 'EquipamentoController.relatorioEquipamentoBeneficioAtivo').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.get('/equipamentos/baixarTodosEquipamentos/:pessoa_id', 'EquipamentoController.locBaixarTodosEquipamentos').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/equipamentos/baixarTodosEquipamentos', 'EquipamentoController.endossoBaixarTodosEquipamentos').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/endosso/localizarPor', 'EndossoController.localizarPor').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/equipamentos/totalAtivos', 'EquipamentoController.totalAtivos')
   /*.middleware([
      'auth'
   ])*/

   Route.post('/equipamentos/updateControle', 'EquipamentoController.updateControle').middleware([
      'auth'
   ])

   Route.post('/equipamentos/localizarControlePor', 'EquipamentoController.localizarControlePor').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/equipamentos/localizarPor', 'EquipamentoController.localizarPor').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])
   Route.post('/equipamentos/localizarEquipaPorAssist24h', 'EquipamentoController.localizarEquipaPorAssist24h').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/equipamentos/localizarProtecao', 'EquipamentoController.localizarProtecao').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/equipamentos/localizarBeneficioPorModelo', 'EquipamentoController.localizarBeneficioPorModelo').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/equipamentos/buscarProtecoes', 'EquipamentoController.buscarProtecoes')
   Route.post('/equipamentos/buscarBeneficios', 'EquipamentoController.buscarBeneficios')
   Route.post('/equipamentos/buscarBaixas', 'EquipamentoController.buscarBaixas')

   Route.post('/equipamento/endosso', 'EquipamentoOutrosController.endosso').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.get('/equipamentos/getLog/:equipamento_id', 'EquipamentoController.getLog').middleware([
      'auth'
   ])

   Route.get('/equipamentos/getIDEndossos/:id', 'EquipamentoOutrosController.getIDEndossos').middleware([
      'auth'
   ])

   Route.get('/equipamentos/getEndossoPorPessoaID/:id', 'EquipamentoOutrosController.getEndossoPorPessoaID').middleware([
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
     ]).middleware([
      'versao'
   ])

     Route.post('/equipamentoProtecao/localizarPorMarca', 'EquipamentoProtecaoController.localizarPorMarca').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])

     Route.post('/equipamentoProtecao/localizarSemProtecao', 'EquipamentoProtecaoController.localizarSemProtecao').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])

   Route.resource('/equipamentoProtecaoStatus', 'EquipamentoProtecaoStatusController').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])

   Route.resource('/equipamentoBeneficio', 'EquipamentoBeneficioController').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])

     Route.post('/equipamentoBeneficio/getLog', 'EquipamentoBeneficioController.getLog').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.resource('/bloqueadorLocalizador', 'BloqueadorLocalizadorController').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])


   Route.resource('/ocorrencias', 'OcorrenciaController').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/ocorrencias/localizar', 'OcorrenciaController.localizar').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/ocorrencias/localizarPor', 'OcorrenciaController.localizarPor').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/ocorrencias/addTerceiro', 'OcorrenciaController.addTerceiro').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.delete('/ocorrencias/deleteTerceiro/:id', 'OcorrenciaController.destroyTerceiro').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.put('/ocorrencias/updateTerceiro/:id', 'OcorrenciaController.updateTerceiro').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.resource('/ocorrenciaStatus', 'OcorrenciaStatusController').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])

   Route.resource('/ocorrenciaCausa', 'OcorrenciaCausaController').middleware([
      'versao'
   ])
   //.middleware(['auth'])

   Route.post('/ocorrencias/localizarPorPeriodo', 'OcorrenciaController.localizarPorPeriodo').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.post('/ocorrencias/localizarTerceiroPorPeriodo', 'OcorrenciaController.localizarTerceiroPorPeriodo').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   Route.resource('/lancamento', 'LancamentoController').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])
   Route.post('/lancamento/localizarPor', 'LancamentoController.localizarPor').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])
   Route.post('/lancamento/cancelar', 'LancamentoController.cancelar').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])
   Route.post('/lancamento/reverter-cancelamento', 'LancamentoController.reverter_cancelamento').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])
   Route.post('/lancamento/inadimplente', 'LancamentoController.inadimplente').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])
   Route.post('/lancamento/reverter_inadimplente', 'LancamentoController.reverter_inadimplente').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])
   Route.post('/lancamento/cancelar_compensacao', 'LancamentoController.cancelar_compensacao').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])

   Route.post('/lancamento/acordo', 'LancamentoController.acordo').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])
   Route.post('/lancamento/gerarLancamentos', 'LancamentoController.gerarLancamentos').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])
   Route.resource('/lancamentoConfig', 'LancamentoConfigController').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])

   Route.post('/lancamento/destroyOS', 'LancamentoController.destroyOS').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])

   Route.post('/lancamentoAddBoleto', 'LancamentoController.gerarBoleto').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])

     Route.post('/lancamentoSegundaViaBoleto', 'LancamentoController.gerarSegundaViaBoleto').middleware([
      'auth'
     ])

   Route.post('/lancamentoLocBoletoOpenBank', 'LancamentoController.lancamentoLocBoletoOpenBank').middleware([
      'auth'
   ])

   Route.post('/baixarBoletoOpenBank', 'LancamentoController.baixarBoletoOpenBank').middleware([
      'auth'
   ]).middleware([
      'versao'
   ])

   /*Route.resource('/rateio', 'RateioController').middleware([
      'auth'
     ])*/


   Route.get('/rateio/statusEmailMassa/:boleto_id', 'RateioController.statusEmailMassa').middleware([
      'auth'
     ]).middleware([
      'versao'
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
     ]).middleware([
      'versao'
   ])

   Route.post('/rateio/simulador', 'RateioController.simulador').middleware([
   'auth'
   ]).middleware([
      'versao'
   ])

   /*Route.post('/rateio/simulador', 'RateioController.simulador').middleware([
   'auth'
   ])*/

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
         ]).middleware([
            'versao'
         ])

   Route.get('/rateio', 'RateioController.index').middleware([
         'auth'
         ]).middleware([
            'versao'
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
      ]).middleware([
         'versao'
      ])

      Route.get('/rateio/relatorio/RelatorioEquipamentosAtivosDoRateio/:rateio_id', 'RateioController.RelatorioEquipamentosAtivosDoRateio').middleware([
         'auth'
         ])


   Route.resource('/planoConta', 'PlanoDeContaController')


   Route.get('/cnab/listarArquivosRemessa', 'CnabController.listarArquivosRemessa').middleware([
      'auth'
      ]).middleware([
         'versao'
      ])

   Route.post('/cnab/downloadRemessa', 'CnabController.downloadRemessa').middleware([
         'auth'
         ]).middleware([
            'versao'
         ])


   Route.post('/relatorios/ampliacaoProtecao', 'Relatorio/Categoria/AmpliacaoProtecaoController.locEquipaPorCategoriaAno').middleware([
      'auth'
      ])
   Route.post('/relatorios/dispararEmail', 'Relatorio/Categoria/AmpliacaoProtecaoController.dispararEmail').middleware([
      'auth'
      ])
   Route.post('/relatorios/dispararZap', 'Relatorio/Categoria/AmpliacaoProtecaoController.dispararZap').middleware([
      'auth'
      ])

   /*Route.post('/cnab/arquivarArquivoRemessa', 'CnabController.arquivarArquivoRemessa').middleware([
         'auth'
         ])*/
   Route.get('/tiAddBoleto',async ({response}) => {
      try {
         const lancamento = use('App/Models/Lancamento')
         const lanca= await lancamento.find(3384)
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

         /*let res= await boleto.prorrogarDataVencimento({
            numeroContrato: '123455',
            modalidade: 1,
            dataVencimento: "2018-09-20T00:00:00-03:00",
            conta_id: 1
         })*/
         let res= await boleto.novoBoleto(lanca.toJSON(),{
            conta_id: 1
         })
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
         let res= await boleto.localizarBoleto({conta_id: 1, nossoNumero: 64745, modalidade: 1, convenio: '464228'})
         return res
      } catch (e) {
         console.log('PRINCIPAL ', e)
         response.status(200).send({ success: false, message: 'modulo principal ' + e.message })
      }

   })

   Route.post('/prorrogarDV',async ({response, request}) => {
      try {
         let config= request.all()

         const factory= use('App/Services/Bank/Factory')
         let boleto= await factory().Boleto('sicoob')
         let res= await boleto.prorrogarDataVencimento(config)
         return res

      } catch (error) {
         return error
      }

   })

   Route.get('/segundaVia/:nossoNumero',async ({response, params, request}) => {
      try {
         let config= request.all()
         let nossoNumero= params.nossoNumero  //'71122'

         const factory= use('App/Services/Bank/Factory')
         let boleto= await factory().Boleto('sicoob')
         config= {
            parametros: {
               numeroContrato: '464228',
               modalidade: 1,
               nossoNumero: nossoNumero,
               //linhaDigitavel: '',
               //codigoBarras: '',
               gerarPdf: true
            },
            conta_id: 1

         }
         let res= await boleto.segundaVia(config)
         return res

      } catch (error) {
         return error
      }

   })

   Route.post('/baixa',async ({response, request}) => {
      try {
         let config= request.all()

         const factory= use('App/Services/Bank/Factory')
         let boleto= await factory().Boleto('sicoob')
         let res= await boleto.baixa(config)
         return res

      } catch (error) {
         return error
      }

   })

   Route.get('/openbank/sicoob/auth',async ({response, request}) => {
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

   Route.resource('/beneficio', 'BeneficioController').middleware([
      'versao'
   ])


   Route.resource('/pendenciaSetup', 'PendenciaSetupController').middleware([
      'auth'
     ])

   Route.resource('/pendencia', 'PendenciaController').middleware([
      'auth'
   ])

   Route.resource('/ordemServico', 'ordem_servico/OrdemServicoController').middleware([
      'auth'
     ]).middleware([
      'versao'
   ])

  Route.post('/ordemServico/localizarPor', 'ordem_servico/OrdemServicoController.localizarPor').middleware([
   'versao'
])
  // Route.post('/ordemServico/localizarOS', 'ordem_servico/OrdemServicoController.localizarOS')

  Route.post('/ordemServico/localizarBeneficiosTerceirosAssist24h', 'ordem_servico/OrdemServicoController.localizarBeneficiosTerceirosAssist24h')

  Route.get('/estoque/localizar/:descricao', 'EstoqueController.localizar').middleware([
   'auth'
   ])
  Route.post('/estoque/localizarPor', 'EstoqueController.localizarPor').middleware([
   'auth'
   ])

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

   Route.get('/gerenciador/:id', '/Pasta/PastaController.getPessoa')

   Route.get('/gerenciador_parte/:id', async ({request, response, params}) => {

      try {

         let o= { parent: params.id, data: [{id:new Date().getTime(), "$level": 2, value: 'child ' + params.id, state: 'finalized'}]}
         return response.send(o)
      } catch(e) {
         return response.status(400).send(end)
      }
   })


   Route.post('/sign/equipa/contratoAdesao', 'EquipamentoSignController.contratoAdesao').middleware([
      'auth'
   ])
   Route.post('/sign/equipa/updateSign', 'EquipamentoSignController.updateSign').middleware([
      'auth'
   ])
   Route.post('/sign/equipa/solicitarAssinatura', 'EquipamentoSignController.solicitarAssinatura').middleware([
      'auth'
   ])
   //Route.get('/sign/equipa/token/:sign_id', 'EquipamentoSignController.tokenSign')
   Route.post('/sign/equipa/cancelSign', 'EquipamentoSignController.cancelSign').middleware([
      'auth'
   ])
   Route.post('/sign/adesao/pdf', 'EquipamentoSignController.pdf')
   Route.post('/sign/adesao/toSign', 'EquipamentoSignController.contratoAdesao')

   Route.get('/sign/pdf_link/:sign_id', 'PreCadastroController.pdf_link')
   //Route.get('/sign/pdf/:tipo/:arquivo', 'PreCadastroController.pdf')


   Route.post('/sign/inscricao/toSign', 'PreCadastroController.fichaInscricao')
   Route.get('/sign/token/:sign_id', 'PreCadastroController.enviarTokenSign')
   Route.get('/sign/retoken/:sign_id', 'PreCadastroController.reEnviarTokenSign')
   Route.post('/sign/validarTokenSign', 'PreCadastroController.validarTokenSign')
   Route.post('/sign/cancelSign', 'PreCadastroController.cancelSign').middleware([
      'auth'
   ])
   Route.post('/sign/updateSign', 'PreCadastroController.updateSign').middleware([
      'auth'
   ])
 /*Route.post('/sign/solicitarAssinatura', 'PreCadastroController.solicitarAssinatura').middleware([
      'auth'
   ])*/
   Route.post('/sign/fichaInscricao', 'PreCadastroController.fichaInscricao').middleware([
      'auth'
   ])
   Route.post('/sign/fichaInscricaoPDF', 'PreCadastroController.fichaInscricaoPDF')

   Route.get('/preCadastro/localizarPorID/:id', 'PreCadastroController.localizarPorID')
   Route.post('/preCadastro/localizarPor', 'PreCadastroController.localizarPor')
   Route.post('/preCadastro/gerarOsAdesao', 'PreCadastroController.gerarOsAdesao').middleware([
      'auth'
   ])
   Route.post('/preCadastro/update', 'PreCadastroController.update').middleware([
      'auth'
   ])
   Route.get('/preCadastro/getPessoaAddPreCadastro/:cpfCnpj', 'PreCadastroController.getPessoaAddPreCadastro').middleware([
      'auth'
   ])

   /// Testes SIGN
   Route.post('/sign/add', "SignController.add").middleware([
      'auth'
   ])
   Route.post('/sign/update', "SignController.update").middleware([
      'auth'
   ])
   Route.get('/sign/cancelar/:id', "SignController.cancelar").middleware([
      'auth'
   ])
   Route.get('/sign/enviarToken/:id', "SignController.enviarToken")
   Route.post('/sign/gerarDocumento', "SignController.gerarDocumento")
   Route.post('/sign/solicitarAssinatura', "SignController.solicitarAssinatura").middleware([
      'auth'
   ])
   //Route.post('/sign/pdf/:sign_id/:tipo', 'SignController.pdf')
   Route.get('/sign/pdf/:sign_id/:tipo/:isBase64', 'SignController.pdf')
   Route.get('/sign/show/:sign_id', 'SignController.show')
   Route.post('/sign/updateStatus', "SignController.updateStatus").middleware([
      'auth'
   ])
   Route.get('/sign/converter', "SignController.converter")


   /*Route.get('/sms/saldo',async ({response}) => {
      try {
         const Env = use('Env')
         const factory= use('App/Services/SMS/Factory')
         let sms= await factory().Servico(Env.get('SMS_SERVICO'))
         return sms.saldo()
      } catch(e) {
         return e.message
      }
   })

   Route.get('/sms/caixa_entrada',async ({response}) => {
      try {
         const Env = use('Env')
         const factory= use('App/Services/SMS/Factory')
         let sms= await factory().Servico(Env.get('SMS_SERVICO'))
         return sms.caixa_entrada()
      } catch(e) {
         return e.message
      }
   })*/
   /*Route.post('/sms/enviar',async ({request}) => {
      try {
         const data= request.all()
         let tel= data.tel
         let msg= data.msg

         const Env = use('Env')
         const factory= use('App/Services/SMS/Factory')
         let sms= await factory().Servico(Env.get('SMS_SERVICO'))
         return await sms.enviar(tel, msg)
      } catch(e) {
         return e.message
      }
   })*/
   Route.post('/sms/enviar',async ({request}) => {
      try {
         const data= request.all()
         let tel= data.tel
         let msg= data.msg

         const Env = use('Env')
         const factory= use('App/Services/SMS/Factory')
         let sms= await factory().Servico(Env.get('SMS_SERVICO'))
         return await sms.enviar(data)
      } catch(e) {
         return e.message
      }
   })

   Route.post('/b3', async ({request}) => {
      try {
         const data= request.all()

         let o= {acao: {}, opcao: {}, liquido: 0, total_corretagem: 0,total_nota: 0}

         let tabelaAcao= { liquidacao: parseFloat("0.000250"), emolumentos: parseFloat("0.000050")}
         let tabelaOpcao= { liquidacao:parseFloat("0.000275"), emolumentos: parseFloat("0.000370"), registro: parseFloat("0.000695") }
         let tabelaDayTrade= {liquidacao:parseFloat("0.000250"), emolumentos: parseFloat("0.000050"), }

         const corretagem= (valor = 0.00, isAcao= true) => {
            let correta= 0.00
            const tx_inss= parseFloat("0.1068")
            const tx_outros= parseFloat("0.039")

            let o= { corretagem: 0, inss: 0, outros: 0, total: 0}

            if ( valor <= 135.07) {
               const tx = parseFloat("2.7")
               o.corretagem= (valaor * tx )
               o.corretagem= o.corretagem * parseFloat('0.15')
               o.inss= o.corretagem * tx_inss
               o.outros= o.corretagem * tx_outros

            }
            if (valor >= 135.08 &&  valor <= 498.62) {
               const tx= parseFloat("0.02")
               const adicional= 0
               o.corretagem= (valor * tx ) + adicional
               o.corretagem= o.corretagem * parseFloat('0.15')
               o.inss= o.corretagem * tx_inss
               o.outros= o.corretagem * tx_outros
            }
            if (valor >= 498.63 &&  valor <= 1514.69) {
               const tx= parseFloat("0.015")
               const adicional= 2.49
               o.corretagem= (valor * tx ) + adicional
               o.corretagem= o.corretagem * parseFloat('0.15')
               o.inss= o.corretagem * tx_inss
               o.outros= o.corretagem * tx_outros
            }
            if (valor >= 1514.70 &&  valor <= 3029.38) {
               const tx= parseFloat("0.010")
               const adicional= 10.06
               o.corretagem= (valor * tx ) + adicional
               o.corretagem= o.corretagem * parseFloat('0.15')
               o.inss= o.corretagem * tx_inss
               o.outros= o.corretagem * tx_outros
            }
            if (valor > 3029.39) {
               const tx= parseFloat("0.005")
               const adicional= 25.21
               o.corretagem= (valor * tx ) + adicional
               o.corretagem= o.corretagem * parseFloat('0.15')
               o.inss= o.corretagem * tx_inss
               o.outros= o.corretagem * tx_outros
            }

            o.irrf= 0
            let baseIRRF= 0
            if ( isAcao) {
               baseIRRF= data.valor_acao
            } else {
               if (data.valor_op !== 0)  {
                  baseIRRF= data.valor_opcao
               }
            }
            if ( baseIRRF !== 0) {
               o.irrf= baseIRRF * 0.00005
               if ( o.irrf < 0) {
                  o.irrf= o.irrf * -1
               }
            }

            o.total= o.corretagem + o.inss + o.outros + o.irrf

            return o
         }

         if ( data.acao > 0 ) {
            o.acao.valor= data.acao
            o.acao.emolumentos= data.acao * tabelaAcao.emolumentos
            o.acao.liquidacao= data.acao * tabelaAcao.liquidacao
            o.acao.corretagem= corretagem(data.acao)
            o.acao.despesas= o.acao.emolumentos + o.acao.liquidacao + o.acao.corretagem.total
            o.acao.valor_liquido_nota = data.valor_acao
            o.acao.valor_bruto_nota= data.valor_acao + o.acao.despesas
            o.liquido += data.valor_acao
            o.total_corretagem += o.acao.despesas
            o.total_nota += data.valor_acao + o.acao.despesas
         }

         if ( data.opcao > 0 ) {
            o.opcao.valor= data.opcao
            o.opcao.emolumentos= data.opcao * tabelaOpcao.emolumentos
            o.opcao.liquidacao= data.opcao * tabelaOpcao.liquidacao
            o.opcao.registro= data.opcao * tabelaOpcao.registro

            o.opcao.corretagem= corretagem(data.opcao, false)
            o.opcao.despesas= o.opcao.emolumentos + o.opcao.liquidacao + o.opcao.corretagem.total
            o.opcao.valor_liquido_nota = data.valor_opcao
            o.opcao.valor_bruto_nota= data.valor_opcao + o.opcao.despesas
            o.liquido += data.valor_opcao
            o.total_corretagem += o.opcao.despesas
            o.total_nota += data.valor_opcao + o.opcao.despesas
         }

         o.total_nota= o.liquido + o.total_corretagem

         if ( data.calcular) {
            let nCorretaLucro= o.total_corretagem +  ( (o.total_corretagem *  data.calcular.percentual_lucro) / 100)
            let nNotaComLucroCorreta= ( (o.total_nota *  data.calcular.percentual_lucro) / 100)
            let valorTotalComLucro= o.total_nota +  nNotaComLucroCorreta
            let lucroLiquidoSemCorreta=  nNotaComLucroCorreta - nCorretaLucro
            let percentual_lucroReal=   ( (valorTotalComLucro - (nNotaComLucroCorreta - lucroLiquidoSemCorreta))) / o.total_nota

            o.lucro= {
               valorNota: o.total_nota,
               corretagem: nCorretaLucro,
               percentual_lucro: data.calcular.percentual_lucro ,
               percentual_real: percentual_lucroReal ,
               lucroLiquidoComCorreta: nNotaComLucroCorreta,
               lucroLiquidoSemCorreta: lucroLiquidoSemCorreta,
               valor_nota: valorTotalComLucro
            }
         }

         const nDespesaDayTrade= (o.liquido * tabelaDayTrade.liquidacao) + (o.liquido * tabelaDayTrade.emolumentos)
         o.dayTrade= { liquido: o.liquido, despesas: nDespesaDayTrade, total: o.liquido + nDespesaDayTrade}

         return o
      } catch(e) {
         return e.message
      }
   })

   Route.get('/etiqueta/pdf', 'Etiqueta/EtiquetaController.pdf')

   Route.post('/etiqueta/endereco', 'Etiqueta/EtiquetaController.endereco').middleware([
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
