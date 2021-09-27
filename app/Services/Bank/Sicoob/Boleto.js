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

		async function baixa(config = null) {
			/**
			 *  Parametros:
			 * modalidade Número que identifica a modalidade do boleto. - 1 SIMPLES COM REGISTRO - 5 CARNÊ DE PAGAMENTOS - 6 INDEXADA - 14 CARTÃO DE CRÉDITO
			 * numeroContrato: (integer) Obrigatorio
			 * nossoNumero: (integer)
			 */
			try {
				const scope = 'baixa'

				config.scope = scope
				config.recurso = 'boleto'
				console.log('recebi parametros config ', config)
				let retToken = await getToken(config)

				if (lodash.has(retToken, 'erroNr')) {
					throw retToken
				}

				let token = retToken.token

				if (!token)
					throw { success: false, erroNr: 801, message: 'Token inválido.' }

				const para = {
					numeroContrato: config.convenio,
					modalidade: config.modalidade,
					nossoNumero: config.nossoNumero,
				}

				let arr = []
				arr.push(para)
				let arrCompile = JSON.stringify(arr)

				const meta = {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${retToken.token}`,
					Client_id: Env.get('SICOOB_CLIENT_ID'),
					scope: scope,
				}
				const headers = new Headers(meta)

				const url = Env.get('SICOOB_URL_COBRANCA') + '/baixa'
				console.log(url)
				console.log(token)
				console.log(meta)
				const response = await fetch(url, {
					method: 'PATCH',
					headers: headers,
					body: arrCompile,
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

				let resposta = await response.json()

				if (response.status === 207) {
					let linha = resposta.resultado[0]
					if (linha.status.codigo === 200) {
						console.log('baixa retornou codigo 200..', resposta)
						resposta = {
							success: true,
							message: 'Baixa realizada com sucesso',
							data: linha.boleto,
						}
					} else {
						throw {
							success: false,
							message: linha.status.mensagem,
							codigo: linha.status.codigo,
						}
					}
				}

				// 207 -> solicitação recebida com sucesso. Verifique o status de cada registro no retorno

				/*if (response.status === 204) {
               throw {
                  success: true,
                  status: 204,
                  message: 'A requisição foi processada com êxito e não está retornando conteúdo!',
               }
            }        */

				let data = resposta

				return data
			} catch (e) {
				console.log('prorrogarDataVencimento ', e)
				let obj = e

				if (lodash.has(e, 'erroNr')) {
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

				throw obj //{ x: 1 }
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
				const scope = 'cobranca_boletos_prorrogacoes_data_vencimento'

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
					Client_id: Env.get('SICOOB_CLIENT_ID'),
					scope: scope,
				}
				const headers = new Headers(meta)

				const url =
					Env.get('SICOOB_URL_COBRANCA') + '/prorrogacoes/data-vencimento'
				console.log(url)
				console.log(token)
				console.log(meta)
				const response = await fetch(url, {
					method: 'PATCH',
					headers: headers,
					body: arrCompile,
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

				if (lodash.has(e, 'erroNr')) {
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

				if (lodash.has(e, 'erroNr')) {
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
				const scope = 'cobranca_boletos_segunda_via'
				config.scope = scope
				config.recurso = 'boleto'

				let retToken = await getToken(config)

				console.log('token retornou ', retToken)

				if (lodash.has(retToken, 'erroNr')) {
					throw retToken
				}

				let token = retToken.token

				if (!token)
					throw { success: false, erroNr: 801, message: 'Token inválido.' }

				/*const para = {
               numeroContrato: '2554645',
               modalidade: 1,
               nossoNumero: '123',
               linhaDigitavel: '',
               codigoBarras: '',
               gerarPdf: true,
            }*/
				const para = config.parametros

				console.log('parametros ', para)

				let query = Object.keys(para)
					.map(
						k => encodeURIComponent(k) + '=' + encodeURIComponent(para[k])
					)
					.join('&')

				const meta = {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${retToken.token}`,
					Client_id: Env.get('SICOOB_CLIENT_ID'),
				}
				const headers = new Headers(meta)

				const url =
					Env.get('SICOOB_URL_COBRANCA') +
					'/' +
					'segunda-via' +
					'?' +
					query

				const response = await fetch(url, {
					method: 'GET',
					headers: headers,
					scope: scope,
				})

				if (response.status === 401) {
					throw {
						success: false,
						erroNr: 401,
						message: 'Acesso não autorizado!',
					}
				}

				if (response.status === 500) {
					throw {
						success: false,
						erroNr: 500,
						message: 'O sistema retornou codigo 500 (Erro interno).',
					}
				}

				if (response.status === 204) {
					throw {
						success: false,
						erroNr: 204,
						message:
							'A requisição foi processada com êxito e não está retornando conteúdo.',
					}
				}

				let data = await response.json()

				console.log(data)

				return data
			} catch (e) {
				console.log('segundaVia ', e)
				let obj = e

				if (lodash.has(e, 'erroNr')) {
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

					if (e.erroNr === 204) {
						return e
					}

					if (e.erroNr === 401) {
						return e
					}

					if (e.erroNr === 500) {
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
			config.tipoJurosMora = lodash.has(config, 'tipoJurosMora')
				? config.tipoJurosMora
				: 2 // 2= taxa mensal 3= isento
			config.diasJurosMora = lodash.has(config, 'diasJurosMora')
				? config.diasJurosMora
				: 6
			config.valorJurosMora = lodash.has(config, 'valorJurosMora')
				? config.valorJurosMora
				: 1 //&& 0.0333

			config.tipoMulta = lodash.has(config, 'tipoMulta')
				? config.tipoMulta
				: 2 // 2= percentual
			config.diasMulta = lodash.has(config, 'diasMulta')
				? config.diasMulta
				: 6
			config.valorMulta = lodash.has(config, 'valorMulta')
				? config.valorMulta
				: 2
			return config
		}

		async function localizarBoleto(config = null) {
			try {
				const scope = 'cobranca_boletos_consultar'
				if (!config) {
					config = { conta_id: null }
					throw {
						success: false,
						erroNr: 802,
						message: 'Não foi informado o arquivo de configuração.',
					}
				}
				if (!lodash.has(config, 'conta_id')) {
					throw {
						success: false,
						erroNr: 803,
						message: 'Não foi informado o id da conta.',
					}
				}
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
					numeroContrato: config.convenio,
					modalidade: 1,
					nossoNumero: config.nossoNumero,
					//"linhaDigitavel":"75691409290104642280209353580013986470000094828"
				}

				let query = Object.keys(para)
					.map(
						k => encodeURIComponent(k) + '=' + encodeURIComponent(para[k])
					)
					.join('&')

				const meta = {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${retToken.token}`,
					Client_id: Env.get('SICOOB_CLIENT_ID'),
				}
				const headers = new Headers(meta)

				const url = Env.get('SICOOB_URL_COBRANCA') + '?' + query
				const response = await fetch(url, {
					method: 'GET',
					headers: headers,
					scope: scope,
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
						message: 'Arquivo de configuração não recebido',
					}

				config = validarArquiConfiguracao(config)
				const scope = 'cobranca_boletos_incluir'
				config.scope = scope
				config.recurso = 'boleto'

				let retToken = await getToken(config)
				let token = retToken.token
				if (!token) throw { success: false, message: 'Token inválido.' }

				const oConta = await localizarConta(config.conta_id)

				let dEmissao = moment().format('YYYY-MM-DD') + 'T00:00:00-03:00'
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
					numeroContaCorrente:
						oConta.contaCorrente + oConta.contaCorrenteDV,
					especieDocumento: 'DM',
					dataEmissao: dEmissao,
					//nossoNumero: 2588658,
					seuNumero: lancamento.id,
					identificacaoBoletoEmpresa: lancamento.id,
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
					tipoMulta: config.tipoMulta,
					dataMulta: dMulta,
					valorMulta: config.valorMulta,

					tipoJurosMora: config.tipoJurosMora, // taxa mensal,
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
					/* mensagensInstrucao: {
                  tipoInstrucao: 1,
                  mensagens: [
                     'Descrição da Instrução 1',
                     'Descrição da Instrução 2',
                     'Descrição da Instrução 3',
                     'Descrição da Instrução 4',
                     'Descrição da Instrução 5',
                  ],
               },*/
					gerarPdf: true,
				}

				// Mensagens
				let arrMsg = gerarMensagens(objBoleto)

				if (!lodash.isEmpty(lancamento.boleto_nota1)) {
					arrMsg.push(lancamento.boleto_nota1)
				}
				if (!lodash.isEmpty(lancamento.boleto_nota2)) {
					arrMsg.push(lancamento.boleto_nota2)
				}
				if (!lodash.isEmpty(lancamento.boleto_nota3)) {
					arrMsg.push(lancamento.boleto_nota3)
				}

				const mensagensInstrucao = {
					tipoInstrucao: 1,
					mensagens: arrMsg,
				}
				objBoleto.mensagensInstrucao = mensagensInstrucao
				// Fim de mensagens.

				let arr = []
				arr.push(objBoleto)
				let arrCompile = JSON.stringify(arr)

				const para = new URLSearchParams({
					Client_id: Env.get('SICOOB_CLIENT_ID'),
					scope: scope,
				})

				const meta = {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
					Client_id: Env.get('SICOOB_CLIENT_ID'),
					scope: scope,
				}
				const headers = new Headers(meta)

				const url = Env.get('SICOOB_URL_COBRANCA')
				console.log(url)
				//console.log(headers)
				console.log(meta)
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
				if (response.status === 500) {
					throw {
						success: false,
						erroNr: 401,
						message: 'Ocorreu um erro interno na comunicação do banco!',
					}
				}

				let data = await response.json() // 207 recebido com sucesso -  200 successo por boleto []

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

					if (e.erroNr === 500) {
						// Erro interno do banco
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

		function gerarMensagens(o) {
			let arr = []
			if (o.tipoJurosMora == 2) {
				let cData = moment(o.dataMulta, 'YYYY-MM-DD').format('DD/MM/YYYY')
				let n = o.valorJurosMora.toFixed(1 / 30)
				if (n.length > 5) {
					n = n.substr(0, 5)
				}
				let m = `A partir de ${cData}, juros de ${n}% mes.` //??
				arr.push(m)
			}

			if (o.tipoMulta == 2) {
				let cData = moment(o.dataJurosMora, 'YYYY-MM-DD').format(
					'DD/MM/YYYY'
				)
				let n = o.valorMulta.toFixed(2)
				if (n.length > 5) {
					n = n.substr(0, 5)
				}
				let m = `A partir de ${cData}, multa de ${n}%.`
				arr.push(m)
			}
			return arr
		}

		return {
			localizarBoleto,
			novoBoleto,
			segundaVia,
			localizarPorPagador,
			prorrogarDataVencimento,
			baixa,
		}
	} catch (e) {
		console.log('função boleto ', e)
	}
}

module.exports = Boleto
