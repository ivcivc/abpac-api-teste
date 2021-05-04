'use strict'

const Auth = use('App/Services/Bank/Sicoob/Auth')
const ModelConta = use('App/Models/Conta')
const moment = use('moment')
const fetch = require('node-fetch')
const { Headers } = require('node-fetch')
const Env = use('Env')
const lodash = use('lodash')

function Boleto() {
   try {
      async function getToken(config) {
         try {
            return await new Auth().getToken(config)
         } catch (e) {
            console.log('getToken error ', e)
            return e
         }
      }

      async function prorrogarDataVencimento(config = null) {
         /**
          *  Parametros:
          * modalidade Número que identifica a modalidade do boleto. - 1 SIMPLES COM REGISTRO - 5 CARNÊ DE PAGAMENTOS - 6 INDEXADA - 14 CARTÃO DE CRÉDITO
          * numeroContrato: (integer) Obrigatorio
          * nossoNumero: (integer)
          * dataVencimento (yyyy-MM-dd)
          */
         try {
            const scope = 'prorrogacoes/data-vencimento'
            config.scope = scope
            config.recurso = 'boleto'

            let retToken = await getToken(config)

            if (lodash.has(retToken, 'erroNr')) {
               throw retToken
            }

            let token = retToken.token

            if (!token)
               throw { success: false, erroNr: 801, message: 'Token inválido.' }

            const para = {
               //numeroCpfCnpj: config.numeroCpfCnpj,
               numeroContrato: config.numeroContrato,
               modalidade: config.modalidade,
               nossoNumero: config.nossoNumero,
               dataVencimento: config.dataVencimento,
            }

            let arr = []
            arr.push(para)
            let arrCompile = JSON.stringify(arr)

            const meta = {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${retToken.token}`,
            }
            const headers = new Headers(meta)

            const url = Env.get('SICOOB_URL_COBRANCA') + '/' + scope
            const response = await fetch(url, {
               method: 'PATCH',
               headers: headers,
               body: arr,
            })

            if (response.status === 401) {
               throw {
                  success: false,
                  erroNr: 401,
                  message: 'Acesso não autorizado!',
               }
            }

            if (response.status === 403) {
               throw {
                  success: false,
                  erroNr: 403,
                  message:
                     'O token de acesso não permite o acesso. Credencial inválida!',
               }
            }

            /*if (response.status === 204) {
               throw {
                  success: true,
                  status: 204,
                  message: 'A requisição foi processada com êxito e não está retornando conteúdo!',
               }
            }        */

            let data = await response.json()

            return data
         } catch (e) {
            console.log('prorrogarDataVencimento ', e)
            let obj = e

            if (lodash(e, 'erroNr')) {
               obj = {
                  message:
                     'Ocorreu um erro de comunicação com o banco provedor.',
                  status: e.status,
                  erroNr: e.status,
                  statusText: e.statusText,
               }

               if (e.erroNr === 601) {
                  return e
               }

               if (e.erroNr === 401 || e.erroNr === 403) {
                  return e
               }

               if (e.erroNr === 801) {
                  // token inválido
                  return e
               }
            }

            return obj //{ x: 1 }
         }
      }

      async function localizarPorPagador(config = null) {
         /**
          *  Parametros:
          * numeroCpfCnpj (obrigatório)
          * numeroContrato: (integer) Obrigatorio
          * codigoSituacao (i) (1-em Aberto; 2-Baixado; 3-Liquidado)
          * dataInicio (yyyy-MM-dd) e dataFim (yyyy-MM-dd)
          */
         try {
            const scope = 'pagadores'
            config.scope = scope
            config.recurso = 'boleto'

            let retToken = await getToken(config)

            if (lodash.has(retToken, 'erroNr')) {
               throw retToken
            }

            let token = retToken.token

            if (!token)
               throw { success: false, erroNr: 801, message: 'Token inválido.' }

            const para = {
               //numeroCpfCnpj: config.numeroCpfCnpj,
               numeroContrato: '2554645',
               //codigoSituacao: 1,
               //dataInicio: '',
               //dataFim: '',
            }

            let query = Object.keys(para)
               .map(
                  k => encodeURIComponent(k) + '=' + encodeURIComponent(para[k])
               )
               .join('&')

            const meta = {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${retToken.token}`,
            }
            const headers = new Headers(meta)

            const url =
               Env.get('SICOOB_URL_COBRANCA') +
               '/' +
               scope +
               '/' +
               config.numeroCpfCnpj +
               '?' +
               query
            const response = await fetch(url, {
               method: 'GET',
               headers: headers,
            })

            if (response.status === 401) {
               throw {
                  success: false,
                  erroNr: 401,
                  message: 'Acesso não autorizado!',
               }
            }

            if (response.status === 403) {
               throw {
                  success: false,
                  erroNr: 403,
                  message:
                     'O token de acesso não permite o acesso. Credencial inválida!',
               }
            }

            /*if (response.status === 204) {
               throw {
                  success: true,
                  status: 204,
                  message: 'A requisição foi processada com êxito e não está retornando conteúdo!',
               }
            }        */

            let data = await response.json()

            return data
         } catch (e) {
            console.log('localizarBoleto ', e)
            let obj = e

            if (lodash(e, 'erroNr')) {
               obj = {
                  message:
                     'Ocorreu um erro de comunicação com o banco provedor.',
                  status: e.status,
                  erroNr: e.status,
                  statusText: e.statusText,
               }

               if (e.erroNr === 601) {
                  return e
               }

               if (e.erroNr === 401 || e.erroNr === 403) {
                  return e
               }

               if (e.erroNr === 801) {
                  // token inválido
                  return e
               }
            }

            return obj //{ x: 1 }
         }
      }

      async function segundaVia(config = null) {
         try {
            const scope = 'segunda-via'
            config.scope = scope
            config.recurso = 'boleto'

            let retToken = await getToken(config)

            if (lodash.has(retToken, 'erroNr')) {
               throw retToken
            }

            let token = retToken.token

            if (!token)
               throw { success: false, erroNr: 801, message: 'Token inválido.' }

            const para = {
               numeroContrato: '2554645',
               modalidade: 1,
               nossoNumero: '123',
               linhaDigitavel: '',
               codigoBarras: '',
               gerarPdf: true,
            }

            let query = Object.keys(para)
               .map(
                  k => encodeURIComponent(k) + '=' + encodeURIComponent(para[k])
               )
               .join('&')

            const meta = {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${retToken.token}`,
            }
            const headers = new Headers(meta)

            const url =
               Env.get('SICOOB_URL_COBRANCA') + '/' + scope + '?' + query
            const response = await fetch(url, {
               method: 'GET',
               headers: headers,
            })

            if (response.status === 401) {
               throw {
                  success: false,
                  erroNr: 401,
                  message: 'Acesso não autorizado!',
               }
            }

            let data = await response.json()

            return data
         } catch (e) {
            console.log('localizarBoleto ', e)
            let obj = e

            if (lodash(e, 'erroNr')) {
               obj = {
                  message:
                     'Ocorreu um erro de comunicação com o banco provedor.',
                  status: e.status,
                  erroNr: e.status,
                  statusText: e.statusText,
               }

               if (e.erroNr === 601) {
                  return e
               }

               if (e.erroNr === 401) {
                  return e
               }

               if (e.erroNr === 801) {
                  // token inválido
                  return e
               }
            }

            return obj //{ x: 1 }
         }
      }

      async function localizarConta(conta_id) {
         return new Promise(async (resolve, reject) => {
            const modelConta = await ModelConta.find(conta_id)
            if (!modelConta)
               throw {
                  success: false,
                  message: 'Conta para emissão de boleto não encontrada.',
               }
            if (modelConta.modeloBoleto !== 'sicoob')
               throw {
                  success: false,
                  message:
                     'Esta conta não foi configurada para emissão de boleto.',
               }
            resolve(modelConta.toJSON())
         })
      }

      function validarArquiConfiguracao(config) {
         if (!config) config = {}
         config.diasJurosMora = 6
         config.valorJurosMora = 1 && 0.0333
         config.diasMulta = 6
         config.valorMulta = 2
         return config
      }

      async function localizarBoleto(config = null) {
         try {
            const scope = 'cobranca_boletos_consultar'
            config.scope = scope
            config.recurso = 'boleto'

            let retToken = await getToken(config)

            if (lodash.has(retToken, 'erroNr')) {
               throw retToken
            }

            let token = retToken.token

            if (!token)
               throw { success: false, erroNr: 801, message: 'Token inválido.' }

            const para = {
               numeroContrato: '2554645',
               modalidade: 1,
               nossoNumero: '123',
            }

            let query = Object.keys(para)
               .map(
                  k => encodeURIComponent(k) + '=' + encodeURIComponent(para[k])
               )
               .join('&')

            const meta = {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${retToken.token}`,
            }
            const headers = new Headers(meta)

            const url = Env.get('SICOOB_URL_COBRANCA') + '?' + query
            const response = await fetch(url, {
               method: 'GET',
               headers: headers,
            })

            if (response.status === 401) {
               throw {
                  success: false,
                  erroNr: 401,
                  message: 'Acesso não autorizado!',
               }
            }

            let data = await response.json()

            return data
         } catch (e) {
            console.log('localizarBoleto ', e)
            let obj = e

            if (lodash(e, 'erroNr')) {
               obj = {
                  message:
                     'Ocorreu um erro de comunicação com o banco provedor.',
                  status: e.status,
                  erroNr: e.status,
                  statusText: e.statusText,
               }

               if (e.erroNr === 601) {
                  return e
               }

               if (e.erroNr === 401) {
                  return e
               }

               if (e.erroNr === 801) {
                  // token inválido
                  return e
               }
            }

            return obj //{ x: 1 }
         }
      }

      async function novoBoleto(lancamento, config = null) {
         try {
            if (!config)
               throw {
                  success: false,
                  message: 'Arquivo de configuração não recibido',
               }
            config = validarArquiConfiguracao(config)
            const scope = 'cobranca_boletos_incluir'
            config.scope = scope
            config.recurso = 'boleto'

            let retToken = await getToken(config)
            let token = retToken.token
            if (!token) throw { success: false, message: 'Token inválido.' }

            const oConta = await localizarConta(config.conta_id)

            let dVencimento = lancamento.dVencimento.toJSON()
            let cVencimento = dVencimento.substr(0, 10) + 'T00:00:00-03:00'
            let dVencMoment = moment(dVencimento, 'YYYY-MM-DD')
            let dJurosMora =
               dVencMoment
                  .add(config.diasJurosMora, 'day')
                  .format('YYYY-MM-DD') + 'T00:00:00-03:00'
            let dMultaMoment = moment(dVencimento, 'YYYY-MM-DD')
            let dMulta =
               dMultaMoment.add(config.diasMulta, 'day').format('YYYY-MM-DD') +
               'T00:00:00-03:00'

            let objBoleto = {
               numeroContrato: oConta.convenio,
               modalidade: 1,
               numeroContaCorrente: oConta.contaCorrente,
               especieDocumento: 'DM',
               dataEmissao: '2018-09-20T00:00:00-03:00',
               //nossoNumero: 2588658,
               seuNumero: lancamento.id,
               identificacaoBoletoEmpresa: 'Identif boleto empresa',
               identificacaoEmissaoBoleto: 1, // cliente emite
               identificacaoDistribuicaoBoleto: 2, // cliente distribui
               valor: lancamento.valorTotal,
               dataVencimento: dVencimento,
               //dataLimitePagamento: '2018-09-20T00:00:00-03:00',
               //valorAbatimento: 1,
               tipoDesconto: 0, // sem desconto
               //dataPrimeiroDesconto: '2018-09-20T00:00:00-03:00',
               // valorPrimeiroDesconto: 1,
               //dataSegundoDesconto: '2018-09-20T00:00:00-03:00',
               //valorSegundoDesconto: 0,
               //dataTerceiroDesconto: '2018-09-20T00:00:00-03:00',
               //valorTerceiroDesconto: 0,
               tipoMulta: 2,
               dataMulta: dMulta,
               valorMulta: config.valorMulta,

               tipoJurosMora: 2, // taxa mensal,
               dataJurosMora: dJurosMora,
               valorJurosMora: config.valorJurosMora,

               numeroParcela: 1,
               aceite: true,
               //codigoNegativacao: 2,
               //numeroDiasNegativacao: 60,
               codigoProtesto: 3, // não protestar
               // numeroDiasProtesto: 30,
               pagador: {
                  numeroCpfCnpj: lancamento.pessoa.cpfCnpj,
                  nome: lancamento.pessoa.nome,
                  endereco: lancamento.pessoa.endRua,
                  bairro: lancamento.pessoa.endBairro,
                  cidade: lancamento.pessoa.endCidade,
                  cep: lancamento.pessoa.endCep,
                  uf: lancamento.pessoa.endEstado,
                  //email: ['pagador@dominio.com.br'],
               },
               /*beneficiarioFinal: {
               numeroCpfCnpj: '98784978699',
               nome: 'Lucas de Lima',
            },*/
               mensagensInstrucao: {
                  tipoInstrucao: 1,
                  mensagens: [
                     'Descrição da Instrução 1',
                     'Descrição da Instrução 2',
                     'Descrição da Instrução 3',
                     'Descrição da Instrução 4',
                     'Descrição da Instrução 5',
                  ],
               },
               gerarPdf: true,
            }

            let arr = []
            arr.push(objBoleto)
            let arrCompile = JSON.stringify(arr)

            const meta = {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${token}`,
            }
            const headers = new Headers(meta)

            const url = Env.get('SICOOB_URL_COBRANCA')
            const response = await fetch(url, {
               method: 'POST',
               //body: arrCompile,
               body: arrCompile,
               headers: headers,
            })

            console.log('status ', response.status)

            if (response.status === 401) {
               throw {
                  success: false,
                  erroNr: 401,
                  message: 'Acesso não autorizado!',
               }
            }

            let data = await response.json() // 207 recebido com sucesso

            return data
         } catch (e) {
            console.log('Novo boleto ', e)
            let obj = e

            if (lodash(e, 'erroNr')) {
               obj = {
                  message:
                     'Ocorreu um erro de comunicação com o banco provedor.',
                  status: e.status,
                  erroNr: e.status,
                  statusText: e.statusText,
               }

               if (e.erroNr === 601) {
                  return e
               }

               if (e.erroNr === 401) {
                  return e
               }

               if (e.erroNr === 801) {
                  // token inválido
                  return e
               }
            }

            return obj //{ x: 1 }
         }
      }

      return {
         localizarBoleto,
         novoBoleto,
         segundaVia,
         localizarPorPagador,
         prorrogarDataVencimento,
      }
   } catch (e) {
      console.log('função boleto ', e)
   }
}

module.exports = Boleto
