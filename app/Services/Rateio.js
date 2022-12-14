'use strict'
/*Rateio */
const Helpers = use('Helpers')
const lodash = require('lodash')
const ModelEquipamento = use('App/Models/Equipamento')
const ModelOrdemServico = use('App/Models/ordem_servico/OrdemServico')
const ModelLancamento = use('App/Models/Lancamento')
const ModelLancamentoItem = use('App/Models/LancamentoItem')
const Model = use('App/Models/Rateio')
const ServiceConfig = use('App/Services/LancamentoConfig')

const ModelConta = use('App/Models/Conta')
const ModelBoletoConfig = use('App/Models/BoletoConfig')
const ModelRateioConfig = use('App/Models/RateioConfig')
const ModelBoleto = use('App/Models/Boleto')
const ModelEmailLog = use('App/Models/EmailLog')
const ModelRateioEquipamento = use('App/Models/RateioEquipamento')
const ModelRateioEquipamentoBaixa = use('App/Models/RateioEquipamentoBaixa')
const ModelRateioCreditoBaixa = use('App/Models/RateioCreditoBaixa')
const ModelRateioEquipamentoBaixaBeneficio = use(
	'App/Models/RateioEquipamentoBaixaBeneficio'
)

const ModelRateioEquipamentoBeneficio = use(
	'App/Models/RateioEquipamentoBeneficio'
)
const ModelRateioInadimplente = use('App/Models/RateioInadimplente')

const Drive = use('Drive')
const Boleto = use('App/Services/Cnab')

const LancamentoService = use('App/Services/Lancamento')

const moment = require('moment')
moment.locale('pt-br')

const Database = use('Database')

const Redis = use('Redis')

const kue = use('Kue')
const Job = use('App/Jobs/ACBr')

const fs = require('fs')
const { request } = require('http')

const Antl = use('Antl')

const Ws = use('Ws')

class Rateio {
	async get(ID) {
		try {
			const rateio = await Model.findOrFail(ID)
			await rateio.load('equipamentos.beneficios')
			await rateio.load('categorias')
			await rateio.load('resumos')
			await rateio.load('inadimplentes', builder => {
				builder.with('lancamento', b => {
					b.select('id', 'pessoa_id', 'dVencimento', 'dRecebimento')
					b.with('pessoa', p => {
						p.select('id', 'nome')
					})
				})
			})
			await rateio.load('equipamentoBaixas', builder => {
				builder.with('beneficios')
				//builder.with('categorias')
			})
			//await rateio.load('equipamentoBaixas.beneficios')
			//await rateio.load('equipamentoBaixas.categorias')
			await rateio.load('creditoBaixas')
			//await rateio.load('equipamentosBeneficios')
			//await rateio.load('os')

			const os = await this.lista_os(rateio.id)

			return { rateio, os }
		} catch (e) {
			throw e
		}
	}

	async index() {
		const rateio = await Model.query().orderBy('id', 'desc').fetch()

		return rateio
	}

	async config() {
		const rateio = await ModelRateioConfig.query().fetch()
		let conta = await ModelConta.query()
			.where('status', 'Ativo')
			.whereNot('modeloBoleto', '-1')
			.fetch()
		return { rateio, contas: conta }
	}

	async addOrUpdateConfig(payload) {
		try {
			const config = await ModelRateioConfig.query().fetch()

			let registro = null
			let res = null

			if (config.rows.length > 0) {
				registro = config.rows[0]
				res = await ModelRateioConfig.findOrFail(registro.id)
				res.merge(payload)
				await res.save()
			} else {
				res = await ModelRateioConfig.create(payload)
			}

			return res
		} catch (e) {
			throw {
				message: e.message,
				sqlMessage: e.sqlMessage,
				sqlState: e.sqlState,
				errno: e.errno,
				code: e.code,
			}
		}
	}

	async creditoBaixados() {
		const modelLancamento = await ModelLancamento.query()
			//.where('isBaixa', true)
			.where('creditoRateio', 'Sim')
			.where('situacao', 'Compensado')
			.with('pessoa')
			.with('equipamento', builder => {
				builder.with('categoria', builder => {
					builder.select(
						'id',
						'ordem',
						'abreviado',
						'nome',
						'tipo',
						'valorTaxaAdm',
						'percentualRateio'
					)
				})

				builder.with('equipamentoBeneficios', builder => {
					builder.with('beneficio', b => {
						b.select(
							'id',
							'descricao',
							'rateio',
							'modelo',
							'valor',
							'planoDeConta_id'
						)
					})
					builder.where('status', 'Ativo')
					//builder.where('beneficio.rateio', 'Sim')
				})
			})
			.with('endossos', builder => {
				builder.with('categoria', builder => {
					builder.select(
						'id',
						'ordem',
						'abreviado',
						'nome',
						'tipo',
						'valorTaxaAdm',
						'percentualRateio'
					)
				})

				builder.with('equipamentoBeneficios', builder => {
					builder.with('beneficio', b => {
						b.select(
							'id',
							'descricao',
							'rateio',
							'modelo',
							'valor',
							'planoDeConta_id'
						)
					})
					builder.where('status', 'Ativo')
					//builder.where('beneficio.rateio', 'Sim')
				})
			})
			.fetch()
		return modelLancamento
	}

	async equipamentosDeBaixas() {
		try {
			const query = await ModelEquipamento.query()
				.select(
					'id',
					'idPrincipal',
					'placa1',
					'categoria_id',
					'pessoa_id',
					'dAdesao',
					'status',
					'especie1',
					'marca1',
					'modelo1',
					'placa1',
					'chassi1',
					'anoF1',
					'modeloF1',
					'especie2',
					'marca2',
					'modelo2',
					'placa2',
					'chassi2',
					'anoF2',
					'modeloF2',
					'especie3',
					'marca3',
					'modelo3',
					'placa3',
					'chassi3',
					'anoF3',
					'modeloF3',
					'baixa',
					'ratear',
					'dEndosso',
					'updated_at',
					'valorMercado1'
				)

				.with('pessoa', builder => {
					builder.select(
						'id',
						'status',
						'nome',
						'tipoPessoa',
						'cpfCnpj',
						'telSms',
						'parcela',
						'descontoEspecial',
						'endRua',
						'endComplemento',
						'endBairro',
						'endCidade',
						'endEstado',
						'endCep'
					)
				})

				.with('categoria', builder => {
					builder.select(
						'id',
						'ordem',
						'abreviado',
						'nome',
						'tipo',
						'valorTaxaAdm',
						'percentualRateio'
					)
				})

				.with('equipamentoBeneficios', builder => {
					builder.with('beneficio', b => {
						b.select(
							'id',
							'descricao',
							'rateio',
							'modelo',
							'valor',
							'planoDeConta_id'
						)
					})
					builder.where('status', 'Ativo')
					//builder.where('beneficio.rateio', 'Sim')
				})

				//.where('id', '>', 1700),
				.where('ratear', 'Sim')
				.where('baixa', 'Sim')
				.whereNull('idFilho')
				.fetch()

			let queryJson = query.toJSON()

			let categorias = []

			queryJson.forEach(e => {
				e.valorTaxaAdmBase = e.categoria.valorTaxaAdm
				e.valorBeneficiosBase = 0.0
				e.valorRateio = 0.0
				e.valorBeneficios = 0.0
				e.valorTaxaAdm = e.categoria.valorTaxaAdm
				e.valorTotal = 0.0

				let arrBeneficios = []
				e.equipamentoBeneficios.forEach(b => {
					if (b.beneficio.rateio === 'Sim') {
						e.valorBeneficios += b.beneficio.valor
						e.valorBeneficiosBase += b.beneficio.valor
						arrBeneficios.push(b)
					}
				})

				e.equipamentoBeneficios = arrBeneficios

				/*for (var i in e.equipamentoBeneficios) {
               let b = e.equipamentoBeneficios[i]
               if (b.beneficio.rateio === 'Sim') {
                  console.log('beneficio .... ', b.beneficio.nome)
                  b.valorBeneficios += b.beneficio.valor
                  b.valorBeneficiosBase += b.beneficio.valor
               } else {
                  console.log('excluindo .... ')
                  delete e.equipamentoBeneficios[i]
               }
            }*/

				e.pessoa_parcela = e.pessoa.parcela
				e.pessoa_descontoEspecial =
					e.pessoa.descontoEspecial > 0 ? e.pessoa.descontoEspecial : 0

				if (e.pessoa.descontoEspecial === 0) {
					let res = lodash.find(categorias, {
						categoria_id: e.categoria.id,
						isEspecial: false,
						grupo: 0,
					})
					if (res) {
						res.qtd++
						e.categoria = res
					} else {
						const oCateg = {
							//id: new Date().getTime(),
							isEspecial: false,
							grupo: 0,
							ordem: e.categoria.ordem,
							abreviado: e.categoria.abreviado,
							categoria_id: e.categoria.id,
							nome: e.categoria.nome,
							percentualBase: e.categoria.percentualRateio,
							percentualEspecial: e.categoria.percentualRateio,
							percEditavel: e.categoria.percentualRateio,
							qtd: 1,
							txAdm: e.categoria.valorTaxaAdm,
						}
						categorias.push(oCateg)
						e.categoria = oCateg
					}
				} else {
					let res = lodash.find(categorias, {
						categoria_id: e.categoria.id,
						isEspecial: true,
						grupo: e.pessoa.descontoEspecial,
						percentualEspecial: e.pessoa.descontoEspecial,
					})
					if (res) {
						res.qtd++
						e.categoria = res
					} else {
						let perc = (100 - e.pessoa.descontoEspecial) * 0.01
						/*e.categoria.percentualRateio -
                     e.categoria.percentualRateio *
                        (e.pessoa.descontoEspecial * 0.01)*/
						/*e.categoria.percentualRateio -
                     (e.categoria.percentualRateio *
                        e.pessoa.descontoEspecial) /
                        100*/
						const oCateg = {
							id: new Date().getTime(),
							isEspecial: true,
							ordem: e.categoria.ordem,
							abreviado: e.categoria.abreviado,
							grupo: e.pessoa.descontoEspecial,
							categoria_id: e.categoria.id,
							nome: e.categoria.nome,
							percentualBase: e.categoria.percentualRateio,
							percentualEspecial: e.pessoa.descontoEspecial,
							percEditavel: perc,
							qtd: 1,
							txAdm: e.categoria.valorTaxaAdm,
						}
						categorias.push(oCateg)
						e.categoria = oCateg
					}
				}
			})

			const orderCategoria = lodash.orderBy(
				categorias,
				['nome', 'percEditavel'],
				['desc', 'desc']
			)

			//orderCategoria.forEach(e => console.log(e))

			return { categorias: orderCategoria, equipamentos: queryJson }
		} catch (e) {
			throw e
		}
	}

	async equipamentosAtivos(dAdesao) {
		try {
			const query = await ModelEquipamento.query()
				.select(
					'id',
					'idPrincipal',
					'placa1',
					'categoria_id',
					'pessoa_id',
					'dAdesao',
					'status',
					'especie1',
					'marca1',
					'modelo1',
					'placa1',
					'chassi1',
					'anoF1',
					'modeloF1',
					'especie2',
					'marca2',
					'modelo2',
					'placa2',
					'chassi2',
					'anoF2',
					'modeloF2',
					'especie3',
					'marca3',
					'modelo3',
					'placa3',
					'chassi3',
					'anoF3',
					'modeloF3',
					'baixa',
					'ratear',
					'dEndosso',
					'updated_at',
					'valorMercado1'
				)

				.with('pessoa', builder => {
					builder.select(
						'id',
						'status',
						'nome',
						'tipoPessoa',
						'cpfCnpj',
						'telSms',
						'parcela',
						'descontoEspecial',
						'endRua',
						'endComplemento',
						'endBairro',
						'endCidade',
						'endEstado',
						'endCep'
					)
				})

				.with('categoria', builder => {
					builder.select(
						'id',
						'ordem',
						'abreviado',
						'nome',
						'tipo',
						'valorTaxaAdm',
						'percentualRateio'
					)
				})

				.with('equipamentoBeneficios', builder => {
					builder.with('beneficio', b => {
						b.select(
							'id',
							'descricao',
							'rateio',
							'modelo',
							'valor',
							'planoDeConta_id'
						)
					})
					builder.where('status', 'Ativo')
					//builder.where('beneficio.rateio', 'Sim')
				})

				//.where('id', '>', 1700),
				.where('status', 'Ativo')
				.where('dAdesao', '<=', dAdesao)
				.fetch()

			let queryJson = query.toJSON()

			let categorias = []

			queryJson.forEach(e => {
				e.valorTaxaAdmBase = e.categoria.valorTaxaAdm
				e.valorBeneficiosBase = 0.0
				e.valorRateio = 0.0
				e.valorBeneficios = 0.0
				e.valorTaxaAdm = e.categoria.valorTaxaAdm
				e.valorTotal = 0.0

				let arrBeneficios = []
				e.equipamentoBeneficios.forEach(b => {
					if (b.beneficio.rateio === 'Sim') {
						e.valorBeneficios += b.beneficio.valor
						e.valorBeneficiosBase += b.beneficio.valor
						arrBeneficios.push(b)
					}
				})

				e.equipamentoBeneficios = arrBeneficios

				/*for (var i in e.equipamentoBeneficios) {
               let b = e.equipamentoBeneficios[i]
               if (b.beneficio.rateio === 'Sim') {
                  console.log('beneficio .... ', b.beneficio.nome)
                  b.valorBeneficios += b.beneficio.valor
                  b.valorBeneficiosBase += b.beneficio.valor
               } else {
                  console.log('excluindo .... ')
                  delete e.equipamentoBeneficios[i]
               }
            }*/

				e.pessoa_parcela = e.pessoa.parcela
				e.pessoa_descontoEspecial =
					e.pessoa.descontoEspecial > 0 ? e.pessoa.descontoEspecial : 0

				if (e.pessoa.descontoEspecial === 0) {
					let res = lodash.find(categorias, {
						categoria_id: e.categoria.id,
						isEspecial: false,
						grupo: 0,
					})
					if (res) {
						res.qtd++
					} else {
						categorias.push({
							//id: new Date().getTime(),
							isEspecial: false,
							grupo: 0,
							ordem: e.categoria.ordem,
							abreviado: e.categoria.abreviado,
							categoria_id: e.categoria.id,
							nome: e.categoria.nome,
							percentualBase: e.categoria.percentualRateio,
							percentualEspecial: e.categoria.percentualRateio,
							percEditavel: e.categoria.percentualRateio,
							qtd: 1,
							txAdm: e.categoria.valorTaxaAdm,
						})
					}
				} else {
					let res = lodash.find(categorias, {
						categoria_id: e.categoria.id,
						isEspecial: true,
						grupo: e.pessoa.descontoEspecial,
						percentualEspecial: e.pessoa.descontoEspecial,
					})
					if (res) {
						res.qtd++
					} else {
						let perc = (100 - e.pessoa.descontoEspecial) * 0.01
						/*e.categoria.percentualRateio -
                     e.categoria.percentualRateio *
                        (e.pessoa.descontoEspecial * 0.01)*/
						/*e.categoria.percentualRateio -
                     (e.categoria.percentualRateio *
                        e.pessoa.descontoEspecial) /
                        100*/
						categorias.push({
							id: new Date().getTime(),
							isEspecial: true,
							ordem: e.categoria.ordem,
							abreviado: e.categoria.abreviado,
							grupo: e.pessoa.descontoEspecial,
							categoria_id: e.categoria.id,
							nome: e.categoria.nome,
							percentualBase: e.categoria.percentualRateio,
							percentualEspecial: e.pessoa.descontoEspecial,
							percEditavel: perc,
							qtd: 1,
							txAdm: e.categoria.valorTaxaAdm,
						})
					}
				}
			})

			const orderCategoria = lodash.orderBy(
				categorias,
				['nome', 'percEditavel'],
				['desc', 'desc']
			)

			//orderCategoria.forEach(e => console.log(e))

			return { categorias: orderCategoria, equipamentos: queryJson }
		} catch (e) {
			throw e
		}
	}

	async lista_os(rateio_id = null) {
		try {
			let query = null

			if (rateio_id) {
				query = await ModelOrdemServico.query()
					.select(
						'id',
						'marcado',
						'dCompetencia',
						'pessoa_id',
						'ocorrencia_id',
						'equipamento_id',
						'config_id',
						'isCredito',
						'valorTotal',
						'status',
						'updated_at'
					)

					.with('config', builder => {
						builder.select('id', 'descricao', 'modelo')
					})

					.with('pessoa', builder => {
						builder.select('id', 'status', 'nome', 'tipoPessoa')
					})

					.with('equipamento')

					.with('items')
					.with('ocorrencia', builder => {
						builder.select(
							'id',
							'equipamento_id',
							'tipoAcidente',
							'dEvento',
							'qualPlaca',
							'pessoa_id'
						),
							builder.with('equipamento', e => {
								e.select(
									'id',
									'categoria_id',
									'placa1',
									'especie1',
									'marca1',
									'modelo1',
									'placa1',
									'chassi1',
									'anoF1',
									'modeloF1',
									'placa2',
									'especie2',
									'marca2',
									'modelo2',
									'placa2',
									'chassi2',
									'anoF2',
									'modeloF2',
									'placa3',
									'especie3',
									'marca3',
									'modelo3',
									'placa3',
									'chassi3',
									'anoF3',
									'modeloF3'
								)
							})

						builder.with('pessoa', builder => {
							builder.select('id', 'status', 'nome', 'tipoPessoa')
						})
					})

					.orderBy('ocorrencia_id')

					.where('rateio_id', rateio_id)
					.fetch()
			} else {
				query = await ModelOrdemServico.query()
					.select(
						'id',
						'marcado',
						'dCompetencia',
						'pessoa_id',
						'ocorrencia_id',
						'equipamento_id',
						'config_id',
						'isCredito',
						'valorTotal',
						'status',
						'updated_at'
					)

					.with('config', builder => {
						builder.select('id', 'descricao', 'modelo')
					})

					.with('pessoa', builder => {
						builder.select('id', 'status', 'nome', 'tipoPessoa')
					})

					.with('equipamento')

					.with('items')
					.with('ocorrencia', builder => {
						builder.select(
							'id',
							'equipamento_id',
							'tipoAcidente',
							'dEvento',
							'qualPlaca',
							'pessoa_id'
						),
							builder.with('equipamento', e => {
								e.select(
									'id',
									'categoria_id',
									'placa1',
									'especie1',
									'marca1',
									'modelo1',
									'placa1',
									'chassi1',
									'anoF1',
									'modeloF1',
									'placa2',
									'especie2',
									'marca2',
									'modelo2',
									'placa2',
									'chassi2',
									'anoF2',
									'modeloF2',
									'placa3',
									'especie3',
									'marca3',
									'modelo3',
									'placa3',
									'chassi3',
									'anoF3',
									'modeloF3'
								)
							})

						builder.with('pessoa', builder => {
							builder.select('id', 'status', 'nome', 'tipoPessoa')
						})
					})

					.orderBy('ocorrencia_id')

					.whereNull('rateio_id')
					.where('isRatear', true)
					.whereNot('status', 'Cancelado')
					.fetch()
			}

			let queryJson = query.toJSON()

			let arrTree = []

			queryJson.forEach(e => {
				e.ordem_servico_id = e.id
				e.isRoot = false

				if (e.marcado) {
					e.checked = true
				}

				if (e.isCredito) {
					e.valorTotal = e.valorTotal * -1
				}
				e.value = `O.S.: # ${e.id} - ${e.config.descricao}`
				if (e.ocorrencia_id) {
					let resTitulo = lodash.find(arrTree, {
						tag: '_ocorrencia',
					})
					if (!resTitulo) {
						arrTree.push({
							value: 'OCORR??NCIA',
							tag: '_ocorrencia',
							isRoot: true,
							associado: null,
							data: [],
						})
					}

					let res = lodash.find(arrTree, {
						tag: '_ocorrencia',
					})

					let pai = lodash.find(res.data, {
						ocorrencia_id: e.ocorrencia_id,
					})
					if (!pai) {
						let historico = `Ocorrencia: # ${e.ocorrencia_id} (${e.ocorrencia.tipoAcidente})`
						let oPai = {
							checked: e.marcado,
							ocorrencia_id: e.ocorrencia_id,
							value: historico.toUpperCase(),
							associado: e.ocorrencia.pessoa.nome,
							isRoot: true,
							data: [e],
						}
						res.data.push(oPai)
					} else {
						pai.data.push(e)
					}
				}

				if (!e.ocorrencia_id) {
					e.ordem_servico_id = e.id
					e.value = `${e.config.descricao}`

					let resTitulo = lodash.find(arrTree, {
						tag: e.config.modelo,
					})
					if (!resTitulo) {
						arrTree.push({
							value: e.config.descricao.toUpperCase(),
							tag: e.config.modelo,
							isRoot: true,
							associado: null,
							data: [],
						})
					}

					let res = lodash.find(arrTree, {
						tag: e.config.modelo,
					})

					if (!res) {
						let oPai = {
							//ordem_servico_id: e.ordem_servico_id,
							value: `O.S.: # ${e.ordem_servico_id} `,
							associado: null,
							isRoot: true,
							data: [e],
						}
						res.data.push(oPai)
					} else {
						res.data.push(e)
					}
				}
			})

			return arrTree //queryJson
		} catch (e) {
			throw e
		}
	}

	async inadimplentes() {
		try {
			const query = await ModelLancamento.query()
				.select(
					'id',
					'valorTotal',
					'saldoInad',
					'status',
					'pessoa_id',
					'dVencimento',
					'situacao',
					'inadimplente',
					'updated_at'
				)

				.with('pessoa', builder => {
					builder.select('id', 'nome')
				})

				//.whereNull('rateio_id')
				.where('inadimplente', 'Sim')
				//.whereIn('status', ['Acordado', 'Inadimplente'])
				.whereIn('situacao', ['Aberto', 'Compensado'])
				.fetch()

			let queryJsonDebito = [] //query.toJSON()

			for (const key in query.rows) {
				if (Object.hasOwnProperty.call(query.rows, key)) {
					let registro = query.rows[key]
					let e = registro.toJSON()
					e.valorParcela = e.valorTotal
					e.valorTotal = e.valorTotal - e.saldoInad
					queryJsonDebito.push(e)
				}
			}

			const queryCredito = await ModelLancamento.query()
				.select(
					'id',
					'valorCompensado',
					'valorDebitoInad',
					'status',
					'pessoa_id',
					'dVencimento',
					'situacao',
					'inadimplente',
					'updated_at'
				)

				.with('pessoa', builder => {
					builder.select('id', 'nome')
				})

				//.whereNull('rateio_id')
				.where('inadimplente', 'Debito')

				//.whereIn('status', ['Acordado', 'Compensado'])
				.whereIn('situacao', ['Compensado'])
				.fetch()

			let queryJsonCredito = queryCredito.toJSON()

			queryJsonCredito.forEach(e => {
				if (e.valorCompensado > e.valorDebitoInad) {
					e.valorTotal = e.valorDebitoInad * -1
				} else {
					e.valorTotal = e.valorCompensado * -1
				}
			})

			return { debitos: queryJsonDebito, creditos: queryJsonCredito }
		} catch (e) {
			throw e
		}
	}

	async add(payload, trx, auth) {
		let nrErro = null
		await Redis.set('_isGravarRateio', 'sim')

		let equipaAtivos = payload.equipamento.length

		let oRateio = {
			dInicio: moment(payload.periodo.start).format('YYYY-MM-DD'),
			dFim: moment(payload.periodo.end).format('YYYY-MM-DD'),
			equipaAtivos,
		}

		const rateio = await Model.create(oRateio, trx ? trx : null)
		let rateio_id = rateio.id

		const arrOS = []
		const updated_at = moment().format('YYYY-MM-DD hh:mm:ss')
		payload.os.forEach(e => {
			arrOS.push(e.ordem_servico_id)
		})

		const affectedRows = await Database.table('ordem_servicos')
			.whereIn('id', arrOS)
			.transacting(trx ? trx : null)
			.update({ rateio_id, marcado: true, updated_at })

		if (affectedRows != arrOS.length) {
			nrErro = -100
			throw {
				success: false,
				message: 'N??o foi poss??vel atualizar a ordem de servi??o.',
			}
		}

		// Credito de Baixa (Conta receber de baixa quitada - lan??ada como credito rateio)
		let arrCreditoBaixa = []
		for (const key in payload.creditoBaixa) {
			if (payload.creditoBaixa.hasOwnProperty(key)) {
				const e = payload.creditoBaixa[key]
				console.log('credito baixa ', e.id)
				const dRecebimento = moment(e.dRecebimento, 'YYYY-MM-DD').format(
					'YYYY-MM-DD'
				)

				let dEndosso = null
				// Tem situa????o que n??o grava o equipamento_id no lancamento. Ao carregar o credito de baixa, n??o ?? carregado o objeto equipamento (um equipamento baixado)
				if (!e.equipamento) {
					if (e.endossos) {
						e.equipamento = e.endossos[0] // pega o primemeiro equipamento da lista de endossos
					}
				}
				if (e.equipamento) {
					dEndosso = moment(e.equipamento.dEndosso, 'YYYY-MM-DD').format(
						'YYYY-MM-DD'
					)
				}

				let oRegistro = {
					rateio_id: rateio.id,
					dRecebimento: dRecebimento,
					dEndosso: dEndosso,
					lancamento_id: e.id,
					pessoa_id: e.pessoa_id,
					pessoa_nome: e.pessoa.nome,
					placa: e.equipamento.placa1,
					valorCredito: e.valorCompensado,
				}
				arrCreditoBaixa.push(oRegistro)
				await rateio.creditoBaixas().create(oRegistro, trx ? trx : null)

				// Marcar o lancamento como rateado
				let affectedRows = await Database.table('lancamentos')
					.where('id', e.id)
					.where('updated_at', e.updated_at)
					.transacting(trx ? trx : null)
					.update({
						rateio_id: rateio.id,
						updated_at,
						creditoRateio: 'Rateado',
					})

				if (affectedRows != 1) {
					nrErro = -100
					throw {
						success: false,
						message:
							'N??o foi poss??vel atualizar conta lan??amento (Cr??dito de baixa).',
					}
				}
			}
		}
		console.log('indo pro equipamento')
		// Equipamentos
		let arrRateioEquipa = []

		for (const key in payload.equipamento) {
			console.log('Equipamentos ', payload.equipamento.length)
			if (payload.equipamento.hasOwnProperty(key)) {
				const e = payload.equipamento[key]
				console.log('.')
				let registroEquipa = {
					equipamento_id_principal:
						e.idPrincipal === 0 ? e.id : e.idPrincipal, //e.equipamento_id_principal,
					categoria_id: e.categoria_id,
					categoria_abreviado: e.categoria.abreviado,
					categoria_nome: e.categoria.nome,
					chassi: e.chassi1,
					dAdesao: moment(e.dAdesao).format('YYYY-MM-DD'),
					dEndosso: e.dEndosso
						? moment(e.dEndosso).format('YYYY-MM-DD')
						: null,
					baixa: e.baixa,
					especie: e.especie1,
					anoF: e.anoF1,
					equipamento_id: e.id,
					marca: e.marca1,
					modelo: e.modelo1,
					modeloF: e.modeloF1,
					pessoa_nome: e.pessoa.nome,
					pessoa_descontoEspecial: e.pessoa_descontoEspecial,
					pessoa_id: e.pessoa_id,
					pessoa_parcela: e.pessoa_parcela,
					placa: e.placa1,
					valorBeneficios: e.valorBeneficios,
					valorBeneficiosBase: e.valorBeneficiosBase,
					valorRateio: e.valorRateio,
					valorTaxaAdm: e.valorTaxaAdm,
					valorTaxaAdmBase: e.valorTaxaAdmBase,
					valorTotal: e.valorTotal,
					valorMercado1: e.valorMercado1,
				}
				arrRateioEquipa.push(registroEquipa)

				let equipa = await rateio
					.equipamentos()
					.create(registroEquipa, trx ? trx : null)

				// Tabela rateio_equipamento_beneficios
				if (e.equipamentoBeneficios) {
					for (const i in e.equipamentoBeneficios) {
						if (Object.hasOwnProperty.call(e.equipamentoBeneficios, i)) {
							const el = e.equipamentoBeneficios[i]
							let oBene = {
								rateio_equipamento_id: equipa.id,
								beneficio: el.beneficio.descricao,
								modelo: el.beneficio.modelo,
								valor: el.valor,
								pessoa_id: e.pessoa_id,
								rateio_id: rateio.id,
								planoDeConta_id: el.beneficio.planoDeConta_id,
							}
							await ModelRateioEquipamentoBeneficio.create(
								oBene,
								trx ? trx : null
							)
						}
					}
				}

				if (e.baixa == 'Sim') {
					// Marcar no Equipamento (endosso/Baixa/Inativo) como rateado
					console.log('baixa - marcar no equipamento ', e.id)
					let affectedRows = await Database.table('equipamentos')
						.where('id', e.id)
						.where('updated_at', e.updated_at)
						.transacting(trx ? trx : null)
						.update({
							updated_at,
							ratear: 'Rateado',
						})
					if (affectedRows != 1) {
						nrErro = -100
						throw {
							success: false,
							message: `N??o foi poss??vel atualizar equipamento ID ${e.id} (Baixa).`,
						}
					}
				}
			}
		}
		//await rateio.equipamentos().createMany(arrRateioEquipa, trx ? trx : null)

		console.log('Entrando no rateio equipaBaixa linha 1091 ')
		// Equipamentos Baixa (N??o participam diretamente do rateio - copiam o valor rateado e aplica desconto 50% quando for de direito)
		let arrRateioEquipaBaixa = []
		for (const key in payload.equipamentoBaixa) {
			if (payload.equipamentoBaixa.hasOwnProperty(key)) {
				const e = payload.equipamentoBaixa[key]
				console.log('equipamento baixa ', e.id)
				let registroEquipa = {
					categoria_id: e.categoria_id,
					categoria_abreviado: e.categoria.abreviado,
					categoria_nome: e.categoria.nome,
					chassi: e.chassi1,
					dAdesao: moment(e.dAdesao).format('YYYY-MM-DD'),
					dEndosso: moment(e.dEndosso).format('YYYY-MM-DD'),
					baixa: e.baixa,
					especie: e.especie1,
					anoF: e.anoF1,
					equipamento_id: e.id,
					marca: e.marca1,
					modelo: e.modelo1,
					modeloF: e.modeloF1,
					pessoa_nome: e.pessoa.nome,
					pessoa_descontoEspecial: e.pessoa_descontoEspecial,
					pessoa_id: e.pessoa_id,
					pessoa_parcela: e.pessoa_parcela,
					placa: e.placa1,
					valorBeneficios: e.valorBeneficios,
					valorBeneficiosBase: e.valorBeneficiosBase,
					valorRateio: e.valorRateio,
					valorTaxaAdm: e.valorTaxaAdm,
					valorTaxaAdmBase: e.valorTaxaAdmBase,
					valorTotal: e.valorTotal,
					valorMercado1: e.valorMercado1,
				}
				arrRateioEquipaBaixa.push(registroEquipa)

				let equipa = await rateio
					.equipamentoBaixas()
					.create(registroEquipa, trx ? trx : null)

				// Tabela rateio_equipamento_beneficios
				if (e.equipamentoBeneficios) {
					for (const i in e.equipamentoBeneficios) {
						if (Object.hasOwnProperty.call(e.equipamentoBeneficios, i)) {
							const el = e.equipamentoBeneficios[i]
							let oBene = {
								equipa_baixa_id: equipa.id,
								beneficio: el.beneficio.descricao,
								modelo: el.beneficio.modelo,
								valor: el.valor,
								pessoa_id: e.pessoa_id,
								rateio_id: rateio.id,
								planoDeConta_id: el.beneficio.planoDeConta_id,
							}
							await ModelRateioEquipamentoBaixaBeneficio.create(
								oBene,
								trx ? trx : null
							)
						}
					}
				}

				// Marcar no Equipamento (endosso/Baixa/Inativo) como rateado
				let affectedRows = await Database.table('equipamentos')
					.where('id', e.id)
					.where('updated_at', e.updated_at)
					.transacting(trx ? trx : null)
					.update({
						updated_at,
						ratear: 'Rateado',
					})
				if (affectedRows != 1) {
					nrErro = -100
					throw {
						success: false,
						message: 'N??o foi poss??vel atualizar equipamento (Baixa).',
					}
				}
			}
		}

		console.log('Entrando no inadimplente')

		// Inadimplente
		if (lodash.has(payload.inadimplente, 'creditos')) {
			let arrInadGravar = []
			for (const key in payload.inadimplente.creditos) {
				if (payload.inadimplente.creditos.hasOwnProperty(key)) {
					const e = payload.inadimplente.creditos[key]
					arrInadGravar.push({
						tipo: 'credito',
						valorTotal: e.valorTotal,
						lancamento_id: e.lancamento_id,
					})
				}
			}
			await rateio
				.inadimplentes()
				.createMany(arrInadGravar, trx ? trx : null)

			for (const key in payload.inadimplente.creditos) {
				if (payload.inadimplente.creditos.hasOwnProperty(key)) {
					const e = payload.inadimplente.creditos[key]
					console.log(
						'Rateio - creditos inadimplentes (lancamento_id=) ',
						e.lancamento_id
					)
					let affectedRows = await Database.table('lancamentos')
						.where('id', e.lancamento_id)
						//.where('updated_at', e.updated_at)
						.transacting(trx ? trx : null)
						.update({
							//rateio_id: rateio.id,
							updated_at,
							inadimplente: 'Credito',
							valorCreditoInad: e.valorTotal,
						})
					console.log('effect rows ', affectedRows)

					if (affectedRows != 1) {
						nrErro = -100
						throw {
							success: false,
							message:
								'N??o foi poss??vel atualizar conta de cr??dito inadimplente .',
						}
					}
					let planoContaID = await new ServiceConfig().getPlanoConta(
						'receber-credito-inadimplente'
					)
					if (!planoContaID) {
						nrErro = -100
						throw {
							success: false,
							message:
								'Transa????o abortada! Arquivo de configura????o (lan??amento) n??o localizado.',
						}
					}
					await ModelLancamentoItem.create(
						{
							DC: 'D',
							tag: 'IC',
							lancamento_id: e.lancamento_id,
							descricao: 'Cr??dito Inadimplente',
							planoDeConta_id: planoContaID,
							valor: e.valorTotal,
						},
						trx ? trx : null
					)
				}
			}
		}

		if (lodash.has(payload.inadimplente, 'debitos')) {
			let arrInadGravar = []
			for (const key in payload.inadimplente.debitos) {
				if (payload.inadimplente.debitos.hasOwnProperty(key)) {
					const e = payload.inadimplente.debitos[key]
					arrInadGravar.push({
						tipo: 'debito',
						valorTotal: e.valorTotal,
						lancamento_id: e.lancamento_id,
					})
				}
			}
			await rateio
				.inadimplentes()
				.createMany(arrInadGravar, trx ? trx : null)

			for (const key in payload.inadimplente.debitos) {
				if (payload.inadimplente.debitos.hasOwnProperty(key)) {
					const e = payload.inadimplente.debitos[key]
					let affectedRows = await Database.table('lancamentos')
						.where('id', e.lancamento_id)
						//.where('updated_at', e.updated_at)
						.transacting(trx ? trx : null)
						.update({
							//rateio_id: rateio.id,
							updated_at,
							inadimplente: 'Debito',
							valorDebitoInad: e.valorTotal,
						})

					if (affectedRows != 1) {
						nrErro = -100
						throw {
							success: false,
							message:
								'N??o foi poss??vel atualizar conta de d??bito inadimplente.',
						}
					}
					let planoContaID = await new ServiceConfig().getPlanoConta(
						'receber-debito-inadimplente'
					)
					if (!planoContaID) {
						nrErro = -100
						throw {
							success: false,
							message:
								'Transa????o abortada! Arquivo de configura????o (lan??amento) n??o localizado.',
						}
					}
					await ModelLancamentoItem.create(
						{
							DC: 'C',
							tag: 'ID',
							lancamento_id: e.lancamento_id,
							descricao: 'D??bito Inadimplente',
							planoDeConta_id: planoContaID,
							valor: e.valorTotal,
						},
						trx ? trx : null
					)
				}
			}
		}

		// Categoria
		await rateio.categorias().createMany(payload.calculo, trx ? trx : null)

		// Resumo
		await rateio.resumos().createMany(payload.resumo, trx ? trx : null)

		// Gravar coeficiente
		if (payload.isGravarCoeficiente) {
			for (const key in payload.calculo) {
				if (payload.calculo.hasOwnProperty(key)) {
					const e = payload.calculo[key]
					if (!e.isEspecial) {
						await Database.table('categorias')
							.where('id', e.categoria_id)
							.transacting(trx ? trx : null)
							.update({ percentualRateio: e.percentualBase })
					}
				}
			}
		}

		rateio.equipaAtivos = arrRateioEquipa.length
		await rateio.save(trx)

		console.log('finalizando transa????o')
		//await trx.rollback()
		await Redis.set('_isGravarRateio', false)
		await trx.commit()
	}

	async simulador(payload, trx, auth) {
		let nrErro = null

		const updated_at = moment().format('YYYY-MM-DD hh:mm:ss')

		if (payload.isGravarOS) {
			for (const key in payload.os) {
				if (payload.os.hasOwnProperty(key)) {
					const e = payload.os[key]
					const affectedRows = await Database.table('ordem_servicos')
						.where('id', e.ordem_servico_id)
						.transacting(trx ? trx : null)
						.update({ marcado: e.marcado ? 1 : 0 })
				}
			}
		}

		// Gravar coeficiente
		if (payload.isGravarCoeficiente) {
			for (const key in payload.calculo) {
				if (payload.calculo.hasOwnProperty(key)) {
					const e = payload.calculo[key]
					if (!e.isEspecial) {
						await Database.table('categorias')
							.where('id', e.categoria_id)
							.transacting(trx ? trx : null)
							.update({ percentualRateio: e.percEditavel })
					}
				}
			}

			//this.redisCategoriaTemp(payload.calculo)
		}

		await trx.commit()
	}

	/*async redisCategoriaTemp(categoria) {
      if (!categoria) {
         await Redis.del('rateioCategoriaTemp')
      } else {
         const json = JSON.stringify(categoria)
         await Redis.set('rateioCategoriaTemp', json)
      }
   }*/

	async update(ID, data) {
		try {
			let model = await Model.findOrFail(ID)

			const dInicio = moment(data.periodo.start).format('YYYY-MM-DD')
			const dFim = moment(data.periodo.end).format('YYYY-MM-DD')

			model.merge({ dInicio, dFim })

			await model.save()

			return model
		} catch (e) {
			throw {
				message: e.message,
				sqlMessage: e.sqlMessage,
				sqlState: e.sqlState,
				errno: e.errno,
				code: e.code,
			}
		}
	}

	async gerarFinanceiroLoc(rateio_id, isAberto = false) {
		let query = null

		try {
			let model = await Model.findOrFail(rateio_id)

			if (!isAberto) {
				if (model.status !== 'Aberto') {
					throw { message: 'N??o ?? permitido a gera????o de financeiro.' }
				}
			}

			query = await Database.select([
				'e.rateio_id',
				'e.pessoa_id',
				'pessoa_nome',
				'p.cpfCnpj',
				'p.tipoPessoa',
				'p.parcela',

				'p.endRua',
				'p.endBairro',
				'p.endCidade',
				'p.endEstado',
				'p.endComplemento',
				'p.endCep',
				'p.telSms',
				'p.email',
			])
				.from('rateio_equipamentos as e')
				.leftOuterJoin('pessoas as p', 'e.pessoa_id', 'p.id') //.where('pessoas.modulo', 'Associado')
				.groupBy('pessoa_id')
				.sum('e.valorBeneficios as valorBeneficios')
				.sum('valorTaxaAdm as valorTaxaAdm')
				.sum('valorRateio as valorRateio')
				.sum('valorTotal as valorTotal')
				.orderBy(['p.nome'])
				.where('e.rateio_id', rateio_id)

			const queryBaixa = await Database.select([
				'e.rateio_id',
				'e.pessoa_id',
				'pessoa_nome',
				'p.cpfCnpj',
				'p.tipoPessoa',
				'p.parcela',
				'p.endRua',
				'p.endBairro',
				'p.endCidade',
				'p.endEstado',
				'p.endComplemento',
				'p.endCep',
				'p.telSms',
				'p.email',
			])
				.from('rateio_equipamento_baixas as e')
				.leftOuterJoin('pessoas as p', 'e.pessoa_id', 'p.id') //.where('pessoas.modulo', 'Associado')
				.groupBy('pessoa_id')
				.sum('e.valorBeneficios as valorBeneficios')
				.sum('valorTaxaAdm as valorTaxaAdm')
				.sum('valorRateio as valorRateio')
				.sum('valorTotal as valorTotal')
				.orderBy(['p.nome'])
				.where('e.rateio_id', rateio_id)

			let incluiuArray = false
			queryBaixa.forEach(e => {
				delete e['categoria_nome']
				const r = query.find(o => o.pessoa_id === e.pessoa_id)
				if (r) {
					r.valorRateio = r.valorRateio + e.valorRateio
					r.valorTaxaAdm = r.valorTaxaAdm + e.valorTaxaAdm
					r.valorTaxaAdmBase = r.valorTaxaAdmBase + e.valorTaxaAdmBase
					r.valorTotal = r.valorTotal + e.valorTotal
				}
			})

			if (incluiuArray) {
				query = lodash.orderBy(query, ['nome'], ['asc'])
			}

			let conta = await ModelConta.query()
				.where('status', 'Ativo')
				.whereNot('modeloBoleto', '-1')
				.fetch()

			let config = await ModelRateioConfig.query().fetch()

			return {
				rateio: model,
				lista: query,
				contas: conta,
				config,
				baixas: queryBaixa,
			}
		} catch (e) {
			throw {
				message: e.message,
				sqlMessage: e.sqlMessage,
				sqlState: e.sqlState,
				errno: e.errno,
				code: e.code,
			}
		}
	}

	async gerarFinanceiro(payload, trx, auth) {
		console.log('gerando financeiro')
		let nrErro = 0
		try {
			let model = await Model.findOrFail(payload.rateio_id)

			let status = model.status
			if (status !== 'Aberto') {
				throw { message: 'N??o ?? permitido a gera????o de financeiro.' }
			}

			const update_at_db = moment(model.updated_at).format()
			const update_at = moment(payload.updated_at).format()

			if (update_at_db !== update_at) {
				nrErro = -100
				throw {
					success: false,
					message:
						'Transa????o abortada! O cadastro de rateio foi alterado por outro usu??rio.',
				}
			}

			// Rateio config
			const rateioConfig = await ModelRateioConfig.findOrFail(
				payload.config_id
			)

			// Contas (plano de contas)
			const conta = await ModelConta.findOrFail(rateioConfig.conta_id)

			let dVenc = moment(payload.dVencimento).format('YYYY-MM-DD')
			let dcompe = moment(payload.dCompetencia).format('YYYY-MM-DD')

			model.merge({
				status: 'Concluido',
				dVencimento: dVenc,
				dCompetencia: dcompe,
			})

			let boletoConfig = await ModelBoletoConfig.findByOrFail(
				'modelo',
				conta.modeloBoleto
			)

			// Todos os registros do plano de contas para facilitar busca
			const planoDeContas = await Database.select('*').from(
				'plano_de_contas'
			)
			this.planoDeContas = planoDeContas

			const queryBeneficiosAgrupados = await Database.select([
				'b.pessoa_id',
				'b.planoDeConta_id',
			])
				.from('rateio_equipamento_beneficios as b')
				.groupBy('b.pessoa_id', 'b.planoDeConta_id')
				.sum('b.valor as somaBeneficios')
				.where('b.rateio_id', payload.rateio_id)

			const queryBaixaBeneficiosAgrupados = await Database.select([
				'b.pessoa_id',
				'b.planoDeConta_id',
			])
				.from('rateio_equipamento_baixa_beneficios as b')
				.groupBy('b.pessoa_id', 'b.planoDeConta_id')
				.sum('b.valor as somaBeneficios')
				.where('b.rateio_id', payload.rateio_id)

			const query = await Database.select([
				'e.rateio_id',
				'e.pessoa_id',
				'pessoa_nome',
				'p.cpfCnpj',
				'p.tipoPessoa',
				'p.parcela',

				'p.endRua',
				'p.endBairro',
				'p.endCidade',
				'p.endEstado',
				'p.endComplemento',
				'p.endCep',
				'p.telSms',
				'p.email',
			])
				.from('rateio_equipamentos as e')
				.leftOuterJoin('pessoas as p', 'e.pessoa_id', 'p.id') //.where('pessoas.modulo', 'Associado')
				.groupBy('pessoa_id')
				.sum('e.valorBeneficios as valorBeneficios')
				.sum('valorTaxaAdm as valorTaxaAdm')
				.sum('valorRateio as valorRateio')
				.sum('valorTotal as valorTotal')
				.orderBy(['p.nome'])
				.where('e.rateio_id', payload.rateio_id)

			//await model.save(trx ? trx : null)
			const queryBaixa = await Database.select([
				'e.rateio_id',
				'e.pessoa_id',
				'pessoa_nome',
				'p.cpfCnpj',
				'p.tipoPessoa',
				'p.parcela',
				'p.endRua',
				'p.endBairro',
				'p.endCidade',
				'p.endEstado',
				'p.endComplemento',
				'p.endCep',
				'p.telSms',
				'p.email',
			])
				.from('rateio_equipamento_baixas as e')
				.leftOuterJoin('pessoas as p', 'e.pessoa_id', 'p.id') //.where('pessoas.modulo', 'Associado')
				.groupBy('pessoa_id')
				.sum('e.valorBeneficios as valorBeneficios')
				.sum('valorTaxaAdm as valorTaxaAdm')
				.sum('valorRateio as valorRateio')
				.sum('valorTotal as valorTotal')
				.orderBy(['p.nome'])
				.where('e.rateio_id', payload.rateio_id)

			// Incluir baixas no lancamento
			queryBaixa.forEach(e => {
				delete e['categoria_nome']
				const r = query.find(o => o.pessoa_id === e.pessoa_id)
				if (r) {
					r.valorRateio = r.valorRateio + e.valorRateio
					r.valorTaxaAdm = r.valorTaxaAdm + e.valorTaxaAdm
					r.valorTaxaAdmBase = r.valorTaxaAdmBase + e.valorTaxaAdmBase
					r.valorBeneficios = r.valorBeneficios + e.valorBeneficios
					r.valorTotal = r.valorTotal + e.valorTotal
				}
			})

			let nossoNumero = boletoConfig.nossoNumero
			let mom = moment(payload.dVencimento, 'YYYY-MM-DD')
			let ano = `${mom.year()}`

			ano.padEnd(2, '0')
			let nMes = mom.month() + 1 // janeiro === 0
			let mes = `${nMes}`

			mes = mes.padStart(2, '0')

			let mesAno = `${mes}/${ano}`
			let anoMes = `${ano}-${mes}-`

			let strDVenc = moment(payload.dVencimento, 'YYYY-MM-DD').format(
				'YYYY-MM-DD'
			)

			let dia = strDVenc.substr(8, 2)

			dia = dia.padStart(2, '0')

			for (const key in query) {
				if (Object.hasOwnProperty.call(query, key)) {
					const e = query[key]

					//e.nossoNumero = nossoNumero
					//boletoConfig.nossoNumero = nossoNumero++
					//e.modeloBoleto = boletoConfig.modelo

					e.banco = conta.banco
					e.agencia = conta.agencia
					e.agenciaDV = conta.agenciaDV
					e.contaCorrente = conta.contaCorrente
					e.contaCorrenteDV = conta.contaCorrenteDV
					e.convenio = conta.convenio

					e.boleto_nota1 = payload.boleto_nota1
					e.boleto_nota2 = payload.boleto_nota2

					let cParcela = e.parcela
					if (cParcela === 'N') {
						e.parcela = dia
					}

					e.parcela = e.parcela.padStart(2, '0')

					e.dVencimento2 = anoMes + e.parcela
					e.dVencimento = e.parcela + '/' + mesAno

					e.dCompetencia = moment(payload.dCompetencia).format(
						'DD/MM/YYYY'
					)
					e.dCompetencia2 = moment(payload.dCompetencia).format(
						'YYYY-MM-DD'
					)

					await boletoConfig.save()

					// Gerar lan??amento de contas a receber
					let lancamentoAdd = await this.addReceber(
						trx,
						auth,
						e,
						rateioConfig,
						queryBeneficiosAgrupados,
						queryBaixaBeneficiosAgrupados
					)
					e.lancamento_id = lancamentoAdd.id

					//let boletoAdd = await this.addBoleto(trx, auth, e, rateioConfig)
				}
			}

			/*const boleto = await new Boleto().gerarBoleto(query)

         if (!boleto.success) {
            throw boleto
         }*/
			//query.forEach(e => {})

			await model.save(trx ? trx : null)

			return model
		} catch (e) {
			throw {
				message: e.message,
				sqlMessage: e.sqlMessage,
				sqlState: e.sqlState,
				errno: e.errno,
				code: e.code,
			}
		}
	}

	async addReceber(
		trx,
		auth,
		item,
		contaRateio,
		queryBeneficiosAgrupados = null,
		queryBaixaBeneficiosAgrupados = null
	) {
		return new Promise(async (resolve, reject) => {
			const lanca = {
				tipo: 'Receita',
				dVencimento: item.dVencimento2,
				dCompetencia: item.dCompetencia2,
				parcelaI: 1,
				parcelaF: 1,
				rateio_id: item.rateio_id,
				pessoa_id: item.pessoa_id,
				conta_id: contaRateio.conta_id,
				valorBase: item.valorTotal,
				valorDesc: 0.0,
				valorAcresc: 0.0,
				valorTotal: item.valorTotal,
				status: 'Aberto',
				situacao: 'Aberto',
				historico: 'Rateio',
				forma: 'boleto',
			}

			const items = []

			if (item.valorRateio > 0) {
				const busca = lodash.find(this.planoDeContas, {
					id: contaRateio.rateio_plano_id,
				})
				let oItem = {
					DC: 'C',
					tag: 'LF',
					descricao: busca.descricao,
					planoDeConta_id: contaRateio.rateio_plano_id,
					valor: item.valorRateio,
				}
				items.push(oItem)
			}

			if (item.valorBeneficios > 0) {
				let arrBenef = queryBeneficiosAgrupados.filter(
					f => f.pessoa_id === item.pessoa_id
				)
				arrBenef.forEach(benef => {
					const busca = lodash.find(this.planoDeContas, {
						id: benef.planoDeConta_id,
					})

					let oItem = {
						DC: 'C',
						tag: 'LF',
						descricao: busca.descricao,
						planoDeConta_id: benef.planoDeConta_id,
						valor: benef.somaBeneficios,
					}
					items.push(oItem)
				})
			}

			if (queryBaixaBeneficiosAgrupados) {
				let arrBenef = queryBaixaBeneficiosAgrupados.filter(
					f => f.pessoa_id === item.pessoa_id
				)
				arrBenef.forEach(benef => {
					const busca = lodash.find(this.planoDeContas, {
						id: benef.planoDeConta_id,
					})

					let oItem = {
						DC: 'C',
						tag: 'LF',
						descricao: busca.descricao,
						planoDeConta_id: benef.planoDeConta_id,
						valor: benef.somaBeneficios,
					}
					items.push(oItem)
				})
			}

			//agfhjgghjhjg()
			if (item.valorTaxaAdm > 0) {
				const busca = lodash.find(this.planoDeContas, {
					id: contaRateio.txAdm_plano_id,
				})
				let oItem = {
					DC: 'C',
					tag: 'LF',
					descricao: busca.descricao,
					planoDeConta_id: contaRateio.txAdm_plano_id,
					valor: item.valorTaxaAdm,
				}
				items.push(oItem)
			}

			lanca.items = items

			return resolve(
				await new LancamentoService().addMassa(lanca, trx, auth, false)
			)
		})
	}

	async addBoleto(trx, auth, item, contaRateio) {
		return new Promise(async (resolve, reject) => {
			const obj = {
				conta_id: contaRateio.conta_id,
				boleto_nota1: contaRateio.boleto_nota1,
				boleto_nota2: contaRateio.boleto_nota2,
				dVencimento: item.dVencimento2,
				dCompensacao: null,

				nossoNumero: item.nossoNumero,
				lancamento_id: item.lancamento_id,
				pessoa_id: item.pessoa_id,

				valorTotal: item.valorTotal,
				status: 'Aberto',
			}

			return resolve(await ModelBoleto.create(obj, trx ? trx : null))
		})
	}

	async localizarEmailMassa(rateio_id, auth) {
		try {
			const query = await ModelLancamento.query()
				.select([
					'id',
					'pessoa_id',
					'dVencimento',
					'valorTotal',
					'forma',
					'isEmail',
					'isZap',
					'isRelatorio',
				])
				.where('rateio_id', rateio_id)
				.where('creditoRateio', 'N??o')
				.with('pessoa', builder => {
					builder.select([
						'id',
						'nome',
						'tipoPessoa',
						'cpfCnpj',
						'email',
						'endRua',
						'endComplemento',
						'endBairro',
						'endCidade',
						'endEstado',
						'endCep',
						'telSms',
					])
				})
				.with('boletos', builder => {
					//builder.where('status', 'Aberto')
					builder.whereIn('status', ['Aberto', 'Compensado'])
				})
				.fetch()

			/*const Ws = use('Ws')
         let topic = Ws.getChannel('email_massa').topic('email_massa')
         if (topic) {
            topic.broadcast('message', {
               operation: 'enviado',
               data: { id: 558, isEmail: 2 },
            })
         }*/

			const rateio = await Model.findOrFail(rateio_id)

			return { rateio, lancamentos: query }
		} catch (e) {
			throw e
		}
	}

	async gerarPDFs() {}

	async dispararEmailMassa(payload, auth) {
		const rateio_id = payload.rateio_id

		try {
			const lista = payload.lista
			const rateio_id = payload.rateio_id

			for (const key in lista) {
				if (Object.hasOwnProperty.call(lista, key)) {
					const e = lista[key]
					const data = {
						rateio_id,
						pessoa_id: e.pessoa_id,
						boleto_id: e.boleto_id,
						lancamento_id: e.lancamento_id,
						metodo: 'disparar-email-massa',
					} // Data to be passed to job handle
					const priority = 'normal' // Priority of job, can be low, normal, medium, high or critical
					const attempts = 2 // Number of times to attempt job if it fails
					const remove = true // Should jobs be automatically removed on completion
					const jobFn = job => {
						// Function to be run on the job before it is saved
						job.backoff()
					}
					const job = kue.dispatch(Job.key, data, {
						priority,
						attempts,
						remove,
						jobFn,
					})

					// If you want to wait on the result, you can do this
					const result = await job.result
				}
			}

			await Redis.set('_gerarFinanceiro', 'livre')

			let topic = Ws.getChannel('email_massa:*').topic(
				'email_massa:email_massa'
			)

			if (topic) {
				topic.broadcast('message', {
					operation: 'enviado',
					data: { id: 558 },
				})
			}

			return {
				success: true,
				message: 'Email(s) entregue(s) na fila de execu????o.',
			}
		} catch (e) {
			console.log('CATH >>>>>>>>>>>>>>>>>>>>>>>> 3')

			await Redis.set('_gerarFinanceiro', 'livre')

			let topic = Ws.getChannel('email_massa:*').topic(
				'email_massa:email_massa'
			)

			if (topic) {
				topic.broadcast('message', {
					operation: 'falha_envio',
					data: { id: 558 },
				})
			}

			throw e
		}
	}

	async statusEmailMassa(boleto_id) {
		try {
			const log = await ModelEmailLog.query()
				.where('boleto_id', boleto_id)
				.orderBy('created_at', 'desc')
				.fetch()

			return log
		} catch (e) {
			throw e
		}
	}

	async PDF_TodosEquipamentosRateioPorPessoa(
		pessoa_id,
		rateio_id,
		retornarPDF = true
	) {
		return new Promise(async (resolve, reject) => {
			try {
				const pasta = Helpers.tmpPath('rateio/equipamentos/')
				let arquivo = `equip_${rateio_id}_${pessoa_id}.pdf`
				arquivo = arquivo.trim()

				if (await Drive.exists(pasta + arquivo)) {
					return resolve({ arquivo, pdfDoc: null, pasta }) // await Drive.get(pasta + arquivo)
				}

				const modelRateio = await Model.findOrFail(rateio_id)

				const model = await ModelRateioEquipamento.query()
					.where('rateio_id', rateio_id)
					.where('pessoa_id', pessoa_id)
					.with('beneficios')
					.fetch()

				const modelEquipamentoBaixa =
					await ModelRateioEquipamentoBaixa.query()
						.where('rateio_id', rateio_id)
						.where('pessoa_id', pessoa_id)
						.with('beneficios')
						.fetch()

				if (model.rows.length == 0 && modelEquipamentoBaixa.rows.length == 0 )			 {
					throw {message: "N??o existem equipamentos para o associado selecionado."}
				}

				const equipaJsonBaixa = modelEquipamentoBaixa.toJSON()

				if (model.rows.length === 0) {
					if (modelEquipamentoBaixa.length === 0) {
						throw { message: 'Equipamento n??o encontrado no rateio' }
					}
				}

				const fonts = {
					Roboto: {
						normal:
							Helpers.publicPath('pdf/fonts/Roboto/') +
							'Roboto-Regular.ttf',
						bold:
							Helpers.publicPath('pdf/fonts/Roboto/') +
							'Roboto-Medium.ttf',
						italics:
							Helpers.publicPath('pdf/fonts/Roboto/') +
							'Roboto-Italic.ttf',
						bolditalics:
							Helpers.publicPath('pdf/fonts/Roboto/') +
							'Roboto-MediumItalic.ttf',
					},
				}

				const PdfPrinter = require('pdfmake/src/printer')
				const printer = new PdfPrinter(fonts)

				let tabela = [
					[
						{ text: 'VE??CULO', bold: true },
						{ text: 'PLACA', bold: true },
						{ text: 'CATEGORIA', bold: true },
						{ text: 'RATEIO', bold: true, alignment: 'right' },
						{ text: 'TERCEIRO', bold: true, alignment: 'right' },
						{ text: 'ASSIST.24h', bold: true, alignment: 'right' },
						{ text: 'OUTROS', bold: true, alignment: 'right' },
						{ text: 'TOTAL', bold: true, alignment: 'right' },
					],
				]

				let tassist24h = 0.0
				let tterceiro = 0.0
				let toutros = 0.0
				let trateio = 0.0
				let associado = ''

				const equipaJson = model.toJSON()

				equipaJsonBaixa.forEach(e => {
					equipaJson.push(e)
				})

				for (const key in equipaJson) {
					if (Object.hasOwnProperty.call(equipaJson, key)) {
						const e = equipaJson[key]
						let assist24h = 0.0
						let terceiro = 0.0
						let outros = 0.0

						let xx = e.beneficios
						let id = e.id

						let descontoEspecial = e.pessoa_descontoEspecial

						for (const b in e.beneficios) {
							const o = e.beneficios[b]
							if (o.modelo === 'Assistencia 24h') {
								let nValor = o.valor
								/*
                           descontoEspecial > 0
                              ? o.valor - (o.valor * descontoEspecial) / 100
                              : o.valor*/
								assist24h += nValor
								tassist24h += nValor
							}
							if (o.modelo === 'Terceiro') {
								let nValor = o.valor
								/*descontoEspecial > 0
                              ? o.valor - (o.valor * descontoEspecial) / 100
                              : o.valor */
								terceiro += nValor
								tterceiro += nValor
							}
							if (o.modelo === 'Outros') {
								let nValor = o.valor
								/*descontoEspecial > 0
                              ? o.valor - (o.valor * descontoEspecial) / 100
                              : o.valor */
								outros += nValor
								toutros += nValor
							}
						}

						const nRateioTxAdm = e.valorRateio + e.valorTaxaAdm
						trateio += nRateioTxAdm

						associado = e.pessoa_nome

						let msgBaixa = ''
						if (e.baixa === 'Sim') {
							const d = moment(e.dEndosso, 'YYYY-MM-DD').format(
								'DD/MM/YYYY'
							)
							msgBaixa = ` - (BAIXADO EM ${d})`
						}

						const obj = [
							//{ text: e.pessoa_nome, bold: false },
							{
								text: e.marca + ' ' + e.modelo,
								bold: e.baixa === 'Sim',
							},
							{ text: e.placa, bold: e.baixa === 'Sim' },
							{
								text: e.categoria_nome + msgBaixa,
								bold: e.baixa === 'Sim',
							},
							{
								text: this.moeda(nRateioTxAdm),
								bold: e.baixa === 'Sim',
								alignment: 'right',
							},
							{
								text: this.moeda(terceiro),
								bold: e.baixa === 'Sim',
								alignment: 'right',
							},
							{
								text: this.moeda(assist24h),
								bold: e.baixa === 'Sim',
								alignment: 'right',
							},
							{
								text: this.moeda(outros),
								bold: e.baixa === 'Sim',
								alignment: 'right',
							},
							{
								text: this.moeda(
									nRateioTxAdm + terceiro + assist24h + outros
								),
								bold: e.baixa === 'Sim',
								alignment: 'right',
							},
						]
						tabela.push(obj)
					}
				}

				const tgeral = tassist24h + tterceiro + toutros + trateio

				const objTotal = [
					{ text: 'TOTAL GERAL', bold: true },
					{ text: '', bold: false },
					{ text: '', bold: false },
					{
						text: this.moeda(trateio),
						bold: true,
						alignment: 'right',
					},
					{
						text: this.moeda(tterceiro),
						bold: true,
						alignment: 'right',
					},
					{
						text: this.moeda(tassist24h),
						bold: true,
						alignment: 'right',
					},
					{
						text: this.moeda(toutros),
						bold: true,
						alignment: 'right',
					},
					{
						text: this.moeda(tgeral),
						bold: true,
						alignment: 'right',
					},
				]

				tabela.push(objTotal)

				const periodo = moment(modelRateio.dFim, 'YYYY-MM-DD').format(
					'MMMM/YYYY'
				)

				const docDefinition = {
					pageSize: 'A4',
					pageOrientation: 'landscape',

					defaultStyle: {
						fontSize: 8,
						bold: true,
					},

					content: [
						{
							columns: [
								{
									image: Helpers.publicPath('/images/logo-abpac.png'),
									width: 30,
									height: 60,
								},
								{
									layout: 'noBorders',
									table: {
										headerRows: 1,
										widths: ['*'],
										body: [
											[
												{
													text:
														'RELAT??RIO ASSOCIADO - DESCRI????O POR PLACA - ' +
														periodo.toUpperCase(),
													bold: true,
													fontSize: 13,
													alignment: 'center',
													margin: [0, 10, 0, 0],
												},
											],
											[
												{
													text: associado.toUpperCase(),
													fontSize: 11,
													alignment: 'center',
													margin: [0, 5, 0, 0],
												},
											],
										],
									},
								},
							],
						},
						{
							layout: 'lightHorizontalLines',
							margin: [0, 15, 0, 0],
							table: {
								headerRows: 1,
								widths: [150, 43, 230, 46, 46, 46, 46, 46],

								body: tabela,
							},
						},
					],
				}

				const pdfDoc = printer.createPdfKitDocument(docDefinition)
				pdfDoc.pipe(fs.createWriteStream(pasta + arquivo))
				pdfDoc.end()

				console.log('gerei o pdf ....')
				return resolve({ arquivo, pdfDoc, pasta })
			} catch (e) {
				console.log('falha===> ', e)
				return reject(e)
			}
		})
	}

	PDF_RateioRelatorioOcorrencias(rateio_id, retornarPDF = true) {
		return new Promise(async (resolve, reject) => {
			try {
				console.log(request)
				const pasta = Helpers.tmpPath('rateio/ocorrencias/')
				const arquivo = `rateio_ocorrencias_${rateio_id}.pdf`

				if (await Drive.exists(pasta + arquivo)) {
					return resolve({ arquivo, pdfDoc: null, pasta }) // await Drive.get(pasta + arquivo)
				}

				const modelRateio = await Model.findOrFail(rateio_id)

				const modelRateioInadimplente =
					await ModelRateioInadimplente.query()
						.where('rateio_id', rateio_id)
						.fetch()
				const inadJson = modelRateioInadimplente.toJSON()
				let inadDebito = 0.0
				let inadCredito = 0.0
				inadJson.forEach(e => {
					if (e.tipo === 'debito') {
						inadDebito += e.valorTotal
					}
					if (e.tipo === 'credito') {
						inadCredito += e.valorTotal
					}
				})

				let creditoBaixa = 0.0
				const modelCreditoBaixa = await ModelRateioCreditoBaixa.query()
					.where('rateio_id', rateio_id)
					.fetch()

				modelCreditoBaixa.rows.forEach(e => {
					creditoBaixa += e.valorCredito
				})

				const modelOrdemServico = await ModelOrdemServico.query()
					.select(
						'id',
						'pessoa_id',
						'equipamento_id',
						'config_id',
						'rateio_id',
						'ocorrencia_id',
						'isPagar',
						'isReceber',
						'isRatear',
						'isCredito',
						'valorTotal'
					)
					.where('rateio_id', rateio_id)
					.orderBy('ocorrencia_id', 'asc')
					//.with('ocorrencia.equipamento')
					.with('ocorrencia', builder => {
						builder.with('equipamento', b => {
							b.select(
								'id',
								'categoria_id',
								'especie1',
								'marca1',
								'modelo1',
								'chassi1',
								'placa1',
								'anoF1',
								'modeloF1',
								'especie2',
								'marca2',
								'modelo2',
								'chassi2',
								'placa2',
								'anoF2',
								'modeloF2',
								'especie3',
								'marca3',
								'modelo3',
								'chassi3',
								'placa3',
								'anoF3',
								'modeloF3'
							)
							b.with('categoria')
						})
						builder.with('pessoa', b => {
							b.select('id', 'nome')
						})
					})

					.with('pessoa')
					.with('config')
					.fetch()

				const osJson = modelOrdemServico.toJSON()

				const objOcorrencia = {}
				const arrOutros = []

				osJson.forEach(e => {
					if (e.ocorrencia) {
						if (!objOcorrencia[e.ocorrencia.id]) {
							objOcorrencia[e.ocorrencia.id] = []
						}
						objOcorrencia[e.ocorrencia.id].push(e)
					} else {
						// Outras O.S. que n??o s??o ocorrencias
						if (e.isCredito) {
							e.nCreditos = e.valorTotal
							e.nSubTotal = 0.0
							e.nDespesas = 0.0
						} else {
							e.nCreditos = 0.0
							e.nSubTotal = e.valorTotal
							e.nDespesas = e.valorTotal
						}
						arrOutros.push(e)
					}
				})

				const arrOcorrencias = []
				let isFindOcorrencia = false

				let oOcorrencia = null

				Object.keys(objOcorrencia).forEach(indice => {
					let x = indice
					const arr = objOcorrencia[indice]
					let nDespesas = 0.0
					let nParticipacoes = 0.0
					let nCreditos = 0.0
					arr.forEach(e => {
						if (lodash(e, 'ocorrencia') && !isFindOcorrencia) {
							isFindOcorrencia = true
							oOcorrencia = e.ocorrencia
						}
						if (e.config.modelo === 'Participa????o (Ocorr??ncia)') {
							if (e.isCredito) {
								//nCreditos += e.valorTotal
								nParticipacoes += e.valorTotal
							} else {
								nParticipacoes += e.valorTotal
							}
						} else {
							if (e.isCredito) {
								nCreditos += e.valorTotal
							} else {
								nDespesas += e.valorTotal
							}
						}
					})

					isFindOcorrencia = false

					let oAgrupado = {
						ocorrencia: oOcorrencia,
						nDespesas,
						nParticipacoes,
						nCreditos,
					}

					arrOcorrencias.push(oAgrupado)
				})

				const fonts = {
					Roboto: {
						normal:
							Helpers.publicPath('pdf/fonts/Roboto/') +
							'Roboto-Regular.ttf',
						bold:
							Helpers.publicPath('pdf/fonts/Roboto/') +
							'Roboto-Medium.ttf',
						italics:
							Helpers.publicPath('pdf/fonts/Roboto/') +
							'Roboto-Italic.ttf',
						bolditalics:
							Helpers.publicPath('pdf/fonts/Roboto/') +
							'Roboto-MediumItalic.ttf',
					},
				}

				const PdfPrinter = require('pdfmake/src/printer')
				const printer = new PdfPrinter(fonts)

				const body = []

				//Antl.formatNumber(trateio)
				let tabelaOcorrencia = {
					layout: 'noBorders', //lightHorizontalLines',
					margin: [0, 15, 0, 0],
					table: {
						//headerRows: 1,
						widths: ['*'],

						body: [],
					},
				}

				arrOcorrencias.forEach(e => {
					let id = `${e.ocorrencia.id}`
					id = id.padStart(8, '0')

					const complemento =
						e.ocorrencia.status === 'Complemento'
							? '      COMPLEMENTO'
							: ''
					tabelaOcorrencia.table.body.push([
						{
							text: 'N??: ' + id + complemento,
							bold: true,
							fontSize: 9,
						},
					])
					let dEvento = ''
					if (e.ocorrencia.dEvento) {
						dEvento = moment(e.ocorrencia.dEvento, 'YYYY-MM-DD').format(
							'DD/MM/YYYY'
						)
					}
					let local = e.ocorrencia.local
						? e.ocorrencia.local.toUpperCase()
						: ''
					let cidade = e.ocorrencia.cidade
						? e.ocorrencia.cidade.toUpperCase()
						: ''
					let uf = e.ocorrencia.uf ? e.ocorrencia.uf : ''
					let bo = e.ocorrencia.bo ? 'BO ' + e.ocorrencia.bo : ''

					tabelaOcorrencia.table.body.push([
						{
							columns: [
								{ text: '', width: 15 },
								{
									text:
										dEvento +
										'     ' +
										' ' +
										local +
										'  ' +
										cidade +
										' ' +
										uf +
										'   ' +
										bo,
									bold: false,
									width: '*',
									fontSize: 8,
								},
							],
						},
					])

					let nSubTotal = this.moeda(e.nDespesas - e.nParticipacoes)

					// Linha 3
					let pessoa = e.ocorrencia.pessoa.nome
					pessoa = pessoa.toUpperCase()
					let qualPlaca = e.ocorrencia.qualPlaca
					let categoria = e.ocorrencia.equipamento.categoria.tipo
					categoria = categoria.toUpperCase()
					let marca = e.ocorrencia.equipamento[`marca${qualPlaca}`]
					marca = marca.toUpperCase()
					let modelo = e.ocorrencia.equipamento[`modelo${qualPlaca}`]
					modelo = modelo.toUpperCase()
					let placa = e.ocorrencia.equipamento[`placa${qualPlaca}`]
					let equipamento =
						'EQUIPAMENTO: ' +
						categoria +
						' ' +
						marca +
						' ' +
						modelo +
						'   ' +
						placa

					tabelaOcorrencia.table.body.push([
						{
							columns: [
								{ text: '', width: 15 },
								{
									text: pessoa + '       ' + equipamento,
									bold: false,
									fontSize: 8,
								},
							],
						},
					])

					let nParticipacao =
						e.nParticipacoes > 0
							? '(' + this.moeda(e.nParticipacoes) + ')'
							: '0,00'

					tabelaOcorrencia.table.body.push([
						{
							columns: [
								{ text: '', width: 15 },
								{
									text: 'INDENIZA????O/CONSERTO',
									bold: true,
									width: 100,
									fontSize: 8,
								},
								{
									text: this.moeda(e.nDespesas),
									bold: true,
									width: 70,
									fontSize: 8,
								},
								{
									text: 'PARTICIPA????O',
									bold: true,
									width: 59,
									fontSize: 8,
								},
								{
									text: nParticipacao,
									bold: true,
									width: 60,
									fontSize: 8,
								},
								{
									text: 'SUBTOTAL',
									bold: true,
									width: 46,
									fontSize: 8,
								},
								{
									text: this.moeda(e.nDespesas - e.nParticipacoes),
									bold: true,
									width: 70,
									fontSize: 8,
								},
								{
									text: 'CREDITO',
									bold: true,
									width: 40,
									fontSize: 8,
									margin: [0, 0, 0, 15],
								},
								{
									text: this.moeda(e.nCreditos),
									bold: true,
									width: 60,
									fontSize: 8,
								},
							],
						},
					])
				})
				body.push([tabelaOcorrencia])

				// Outras ocorrencias
				let oOutros = lodash.groupBy(arrOutros, function (value) {
					return value.config_id + value.isCredito
				})

				let aOutros = []
				Object.keys(oOutros).map(i => {
					const o = oOutros[i]
					let n = lodash.sumBy(o, 'valorTotal')
					let nDespesas = o[0].isCredito ? 0.0 : n
					let nCreditos = o[0].isCredito ? n : 0.0
					aOutros.push({
						descricao: o[0].config.descricao.toUpperCase(),
						nDespesas,
						nCreditos,
					})
				})

				aOutros.forEach(e => {
					let o = [
						{
							text: e.descricao,
							bold: true,
							fontSize: 9,
						},
					]
					body.push(o)
					body.push([
						{
							columns: [
								{ text: '', width: 15 },
								{
									text: 'VALOR LAN??AMENTO',
									bold: true,
									width: 100,
									fontSize: 8,
								},
								{
									text: this.moeda(e.nDespesas),
									bold: true,
									width: 70,
									fontSize: 8,
								},
								{
									text: '', // verificar
									bold: true,
									width: 59,
									fontSize: 8,
								},
								{
									text: '',
									bold: true,
									width: 60,
									fontSize: 8,
								},
								{
									text: 'SUBTOTAL',
									bold: true,
									width: 46,
									fontSize: 8,
								},
								{
									text: this.moeda(e.nDespesas),
									bold: true,
									width: 70,
									fontSize: 8,
								},
								{
									text: 'CREDITOS',
									bold: true,
									width: 40,
									fontSize: 8,
									margin: [0, 0, 0, 15],
								},
								{
									text: this.moeda(e.nCreditos),
									bold: true,
									width: 60,
									fontSize: 8,
								},
							],
						},
					])
				})

				// inadimplentes
				if (inadCredito > 0 || inadDebito > 0) {
					let o = [
						{
							text: 'INADIMPLENTES',
							bold: true,
							fontSize: 9,
						},
					]
					let nCred = this.moeda(inadCredito)
					nCred = inadCredito > 0 ? '(' + nCred + ')' : '0,00'

					body.push(o)
					body.push([
						{
							columns: [
								{ text: '', width: 15 },
								{
									text: 'DEBITOS',
									bold: true,
									width: 60,
									fontSize: 8,
								},
								{
									text: this.moeda(inadDebito),
									bold: true,
									width: 150,
									fontSize: 8,
								},

								{
									text: 'CREDITOS',
									bold: true,
									width: 60,
									fontSize: 8,
								},
								{
									text: nCred,
									bold: true,
									width: 70,
									fontSize: 8,
								},
							],
						},
					])
				}

				// Outros creditos (baixa)
				body.push([
					{
						text: '',
						height: 40,
					},
				])

				if (creditoBaixa > 0) {
					let o = [
						{
							text: 'OUTROS CREDITOS',
							bold: true,
							fontSize: 9,
						},
					]
					let nCred = this.moeda(creditoBaixa)
					nCred = creditoBaixa > 0 ? '(' + nCred + ')' : '0,00'

					body.push(o)
					body.push([
						{
							columns: [
								{ text: '', width: 15 },

								{
									text: 'CREDITOS',
									bold: true,
									width: 60,
									fontSize: 8,
								},
								{
									text: nCred,
									bold: true,
									width: 70,
									fontSize: 8,
								},
							],
						},
					])
				}

				const periodo = moment(modelRateio.dFim, 'YYYY-MM-DD').format(
					'MMMM/YYYY'
				)

				const docDefinition = {
					pageSize: 'A4',
					pageOrientation: 'portrait',

					defaultStyle: {
						fontSize: 13,
						bold: true,
					},

					content: [
						{
							columns: [
								{
									image: Helpers.publicPath('/images/logo-abpac.png'),
									width: 30,
									height: 60,
								},
								{
									layout: 'noBorders',
									table: {
										headerRows: 1,
										widths: ['*'],
										body: [
											[
												{
													text: 'RELAT??RIO DE OCORR??NCIAS',
													bold: true,
													fontSize: 13,
													alignment: 'center',
													margin: [0, 10, 0, 0],
												},
											],
											[
												{
													text: periodo.toUpperCase(),
													fontSize: 11,
													alignment: 'center',
													margin: [0, 5, 0, 0],
												},
											],
										],
									},
								},
							],
						},
						{
							layout: 'noBorders', //lightHorizontalLines',
							margin: [0, 15, 0, 0],
							table: {
								//dontBreakRows: true,
								//keepWithHeaderRows: true,
								//headerRows: 1,
								widths: ['*'],

								body: body,
							},
						},
						{
							image: Helpers.publicPath(
								'/images/assinaturas/cris_marcus.png'
							),
							width: 300,
							height: 100,
							alignment: 'center',
						},
					],
				}

				const pdfDoc = printer.createPdfKitDocument(docDefinition)
				pdfDoc.pipe(fs.createWriteStream(pasta + arquivo))
				pdfDoc.end()

				return resolve({ arquivo, pdfDoc, pasta })
			} catch (e) {
				return reject(e)
			}
		})
	}

	moeda(n) {
		if (lodash.isNull(n)) n = 0.0
		if (lodash.isUndefined(n)) n = 0.0
		if (lodash.isNaN(n)) n = 0.0
		n = Antl.formatNumber(n, {
			minimumFractionDigits: 2,
		})
		return n ? n : '0,00'
	}

	async RelatorioEquipamentosAtivosDoRateio(rateio_id) {
		try {
			const query = await ModelRateioEquipamento.query()
				.where('rateio_id', rateio_id)
				.with('beneficios')
				.with('rateio')
				.with('categoria', build => {
					build.select('id', 'nome', 'abreviado')
				})
				.with('equipamento', build => {
					build.select('id', 'valorMercado1')
				})
				.orderBy('pessoa_nome')
				.fetch()

			let arr = query.toJSON()

			arr.forEach(e => {
				e.anoModelo = `${e.anoF}/${e.modeloF}`
				e.valorMercado = e.equipamento.valorMercado1
				e.rateio_mes_ano = moment(e.rateio.dInicio, 'YYYY-MM-DD').format(
					'MM/YYYY'
				)
				let _assist24hPlano = ''
				let _assist24h = 0
				let _terceiroPlano = ''
				let _terceiro = 0
				let _outrosPlano = ''
				let _outros = 0
				e.beneficios.forEach(b => {
					switch (b.modelo) {
						case 'Terceiro':
							_terceiroPlano = b.beneficio
							_terceiro += b.valor
							break

						case 'Assistencia 24h':
							_assist24hPlano = b.beneficio
							_assist24h = +b.valor
							break

						default:
							_outrosPlano = b.beneficio
							_outros += b.valor
							break
					}
				})
				e._planoAssist24h = _assist24hPlano
				e._assist24h = _assist24h
				e._planoTerceiro = _terceiroPlano
				e._terceiro = _terceiro
				e._PlanoOutros = _outrosPlano
				e._outros = _outros

				if (e.valorMercado1 > 0) {
					if (e.equipamento) {
						e.equipamento.valorMercado1 = e.valorMercado1
					}
				}

				//arr.push(e)
			})

			return arr
		} catch (error) {
			throw error
		}
	}
}

module.exports = Rateio
