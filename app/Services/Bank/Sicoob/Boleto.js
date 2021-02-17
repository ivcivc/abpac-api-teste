'use strict'

const Auth = use('App/Services/Bank/Sicoob/Auth')
const ModelConta = use('App/Models/Conta')
const moment = use('moment')
const fetch = require('node-fetch')
const { Headers } = require('node-fetch')

function Boleto() {
   async function getToken(config) {
      return await new Auth().getToken(config)
   }
   async function localizarBoleto(config = null) {
      let token = await getToken(config)
      return { ok: 'localizar', token: token }
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
      config.valorJurosMora = 0.0333
      config.diasMulta = 6
      config.valorMulta = 2
      return config
   }

   async function localizarBoleto(config = null) {
      const scope = 'cobranca_boletos_consultar'
      config.scope = scope
      let retToken = await getToken(config)
      let token = retToken.token
      if (!token) throw { success: false, message: 'Token inválido.' }

      const para = {
         numeroContrato: '2554645',
         modalidade: 1,
         nossoNumero: '123',
      }

      let query = Object.keys(para)
         .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(para[k]))
         .join('&')

      const meta = {
         'Content-Type': 'application/json',
         Authorization: `Bearer ${retToken.tokenBasic}`,
      }
      const headers = new Headers(meta)

      const url = retToken.url + '/cobranca-bancaria/v1/boletos?' + query
      const response = await fetch(url, {
         method: 'GET',
         headers: headers,
      })

      const data = await response //.json()

      console.log('response= ', data)

      return { ret: data }
   }

   async function novoBoleto(lancamento, config = null) {
      if (!config)
         throw {
            success: false,
            message: 'Arquivo de configuração não recibido',
         }
      config = validarArquiConfiguracao(config)
      const scope = 'cobranca_boletos_consultar'
      config.scope = scope

      let retToken = await getToken(config)
      let token = retToken.token
      if (!token) throw { success: false, message: 'Token inválido.' }

      const oConta = await localizarConta(config.conta_id)

      let dVencimento = lancamento.dVencimento.toJSON()
      let cVencimento = dVencimento.substr(0, 10) + 'T00:00:00-03:00'
      let dVencMoment = moment(dVencimento, 'YYYY-MM-DD')
      let dJurosMora =
         dVencMoment.add(config.diasJurosMora, 'day').format('YYYY-MM-DD') +
         'T00:00:00-03:00'
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

      const para = new URLSearchParams({
         numeroContrato: '2554645',
         modalidade: 1,
         nossoNumero: '123',
      })

      const meta = {
         'Content-Type': 'application/json',
         Authorization: `Bearer ${retToken.tokenBasic}`,
      }
      const headers = new Headers(meta)

      const url = retToken.url + '/cobranca-bancaria/v1/boletos'
      const response = await fetch(url, {
         method: 'POST',
         body: para,
         headers: headers,
      })

      const data = await response.json()

      console.log('response= ', data)

      return { ok: 'novo', token: retToken.token, boleto: objBoleto }
   }

   return { localizarBoleto, novoBoleto }
}

module.exports = Boleto
