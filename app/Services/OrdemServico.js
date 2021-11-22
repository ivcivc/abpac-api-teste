'use strict'

const moment = require('moment')

const Model = use('App/Models/ordem_servico/OrdemServico')
const ModelStatus = use('App/Models/ordem_servico/OrdemServicoStatus')
const ModelItem = use('App/Models/ordem_servico/OrdemServicoItem')
const ModelEquipamento = use('App/Models/Equipamento')
const ModelPessoa = use('App/Models/Pessoa')
const ModelOcorrencia = use('App/Models/Ocorrencia')
const ModelLancamento = use('App/Models/Lancamento')
const ServiceLancamento = use('App/Services/Lancamento')
const ServiceEstoque = use('App/Services/Estoque')
const ModelEstoque = use('App/Models/Estoque')
const ModelOSConfig = use('App/Models/ordem_servico/OsConfig')

const lodash = require('lodash')

const Database = use('Database')

//const Mo = use('App/Models/OcorrenciaTerceiro')

class OrdemServico {
	async getPreCadastro(PRECADASTRO_ID) {
		try {
			const model = await Model.findBy('preCadastro_id', PRECADASTRO_ID)
			await model.load('pessoa')
			await model.load('items')
			//await model.load('ocorrencia')
			//await model.load('ocorrencia.terceiros')
			//await model.load('ocorrencia.causa')
			//await model.load('ocorrencia')
			//await model.load('terceiro')
			await model.load('user')
			await model.load('config')
			await model.load('lancamentos')

			let json = model.toJSON()

			if (json.ocorrencia_id) {
				let ocorrenciaModel = await ModelOcorrencia.findOrFail(
					json.ocorrencia_id
				)

				await ocorrenciaModel.load('terceiros')

				json.ocorrencia = ocorrenciaModel.toJSON()

				let pessoaModel = await ModelPessoa.findOrFail(
					json.ocorrencia.pessoa_id
				)

				let oPessoa = pessoaModel.toJSON()
				json.ocorrencia.pessoa = {
					id: oPessoa.id,
					nome: oPessoa.nome,
					cpfCnpj: oPessoa.cpfCnpj,
				}

				let equipamentoModel = await ModelEquipamento.findOrFail(
					json.ocorrencia.equipamento_id
				)
				let equipaTmp = equipamentoModel.toJSON()
				equipaTmp.placa =
					equipaTmp[`${'placa' + json.ocorrencia.qualPlaca}`]
				equipaTmp.marca =
					equipaTmp[`${'marca' + json.ocorrencia.qualPlaca}`]
				equipaTmp.modelo =
					equipaTmp[`${'modelo' + json.ocorrencia.qualPlaca}`]
				equipaTmp.anoF = equipaTmp[`${'anoF' + json.ocorrencia.qualPlaca}`]
				equipaTmp.modeloF =
					equipaTmp[`${'modeloF' + json.ocorrencia.qualPlaca}`]
				equipaTmp.chassi =
					equipaTmp[`${'chassi' + json.ocorrencia.qualPlaca}`]

				json.ocorrencia.equipamento = equipaTmp
			}

			if (json.ocorrencia_terceiro_id) {
				if (json.ocorrencia) {
					if (json.ocorrencia.terceiros) {
						let terceiro = null
						json.ocorrencia.terceiros.forEach(e => {
							if (e.id === json.ocorrencia_terceiro_id) {
								terceiro = e
							}
						})
						if (terceiro) {
							json.terceiro = terceiro
						}
					}
				}
			}

			if (json.equipamento_id) {
				let equipamentoModel = await ModelEquipamento.findOrFail(
					json.equipamento_id
				)
				await equipamentoModel.load('pessoa')
				json.equipamento = equipamentoModel.toJSON()
			}

			return json
		} catch (e) {
			return null
		}
	}

	async get(ID) {
		try {
			const model = await Model.findOrFail(ID)
			await model.load('pessoa')
			await model.load('items')
			//await model.load('ocorrencia')
			//await model.load('ocorrencia.terceiros')
			//await model.load('ocorrencia.causa')
			//await model.load('ocorrencia')
			//await model.load('terceiro')
			await model.load('user')
			await model.load('config')
			await model.load('lancamentos')

			let json = model.toJSON()

			if (json.ocorrencia_id) {
				let ocorrenciaModel = await ModelOcorrencia.findOrFail(
					json.ocorrencia_id
				)

				await ocorrenciaModel.load('terceiros')

				json.ocorrencia = ocorrenciaModel.toJSON()

				let pessoaModel = await ModelPessoa.findOrFail(
					json.ocorrencia.pessoa_id
				)

				let oPessoa = pessoaModel.toJSON()
				json.ocorrencia.pessoa = {
					id: oPessoa.id,
					nome: oPessoa.nome,
					cpfCnpj: oPessoa.cpfCnpj,
				}

				let equipamentoModel = await ModelEquipamento.findOrFail(
					json.ocorrencia.equipamento_id
				)
				let equipaTmp = equipamentoModel.toJSON()
				equipaTmp.placa =
					equipaTmp[`${'placa' + json.ocorrencia.qualPlaca}`]
				equipaTmp.marca =
					equipaTmp[`${'marca' + json.ocorrencia.qualPlaca}`]
				equipaTmp.modelo =
					equipaTmp[`${'modelo' + json.ocorrencia.qualPlaca}`]
				equipaTmp.anoF = equipaTmp[`${'anoF' + json.ocorrencia.qualPlaca}`]
				equipaTmp.modeloF =
					equipaTmp[`${'modeloF' + json.ocorrencia.qualPlaca}`]
				equipaTmp.chassi =
					equipaTmp[`${'chassi' + json.ocorrencia.qualPlaca}`]

				json.ocorrencia.equipamento = equipaTmp
			}

			if (json.ocorrencia_terceiro_id) {
				if (json.ocorrencia) {
					if (json.ocorrencia.terceiros) {
						let terceiro = null
						json.ocorrencia.terceiros.forEach(e => {
							if (e.id === json.ocorrencia_terceiro_id) {
								terceiro = e
							}
						})
						if (terceiro) {
							json.terceiro = terceiro
						}
					}
				}
			}

			if (json.equipamento_id) {
				let equipamentoModel = await ModelEquipamento.findOrFail(
					json.equipamento_id
				)
				await equipamentoModel.load('pessoa')
				json.equipamento = equipamentoModel.toJSON()
			}

			return json
		} catch (e) {
			throw e
		}
	}

	async add(data, trx, auth) {
		console.log('ADD <======================================================')
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			data.user_id = auth.user.id
			let items = data.items
			delete data['items']

			let objFinanceiro = null
			if (lodash.has(data, 'financeiro')) {
				objFinanceiro = data.financeiro
				delete data['financeiro']
			}

			if (!data['preCadastro_id']) {
				data.preCadastro_id = 0
			}

			const os = await Model.create(data, trx ? trx : null)

			const status = {
				ordem_servico_id: os.id,
				user_id: auth.user.id,
				motivo: 'Inclusão de Ordem de Serviço',
				status: 'Em espera',
			}
			await ModelStatus.create(status, trx ? trx : null)

			if (data.status !== 'Em espera') {
				const status = {
					ordem_servico_id: os.id,
					user_id: auth.user.id,
					motivo: 'Alteração de status',
					status: data.status,
				}
				await ModelStatus.create(status, trx ? trx : null)
			}

			let modelItems = await os.items().createMany(items, trx ? trx : null)

			const modelOsConfig = await ModelOSConfig.findOrFail(os.config_id)

			const isEstoqueEntrada = modelOsConfig.modelo === 'Entrada Estoque'

			if (isEstoqueEntrada) {
				for (const key in modelItems) {
					if (Object.hasOwnProperty.call(modelItems, key)) {
						const item = modelItems[key]
						for (let i = 0; i <= item.quantidade - 1; i++) {
							await item.estoques().create(
								{
									quantidade: 1,
									descricao: item.descricao,
									subtotal: item.subtotal,
									total: item.subtotal,
									entrada_id: item.id,
								},
								trx ? trx : null
							)
						}
					}
				}
			}

			if (!isEstoqueEntrada) {
				for (const key in modelItems) {
					if (Object.hasOwnProperty.call(modelItems, key)) {
						const item = modelItems[key]
						if (item.estoque_id) {
							let queryEstoqueDisponivel = await ModelEstoque.query()
								.where('id', item.estoque_id)
								.fetch()
							//.transacting(trx ? trx : null)

							if (queryEstoqueDisponivel.rows.length === 0) {
								throw {
									message:
										'Item a ser adicionado não está disponível no estoque. Item: ' +
										item.descricao,
								}
							}

							if (queryEstoqueDisponivel.rows.length > 0) {
								const nUpdates = await ModelEstoque.query()
									.where('id', item.estoque_id)
									.whereNull('saida_id')
									.transacting(trx ? trx : null)
									.update({
										saida_id: item.id,
										updated_at: moment().format(),
									})
								if (nUpdates === 0) {
									throw {
										message:
											'Não foi possível registrar no estoque.  Item: ' +
											item.descricao,
									}
								}
							}
						}
					}
				}
			}

			if (objFinanceiro) {
				objFinanceiro.ordem_servico_id = os.id

				await new ServiceLancamento().gerarLancamentos(
					objFinanceiro,
					trx,
					auth,
					false
				)
			}

			await trx.commit()

			/*await os.load('config')
         await os.load('pessoa')
         await os.load('items')
         await os.load('user')
         await os.load('lancamentos')

         return os*/
			return await this.get(os.id)
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async update(ID, data, trx, auth) {
		console.log(
			'update ======================================================'
		)
		let nrErro = null
		if (!trx) {
			trx = await Database.beginTransaction()
		}
		try {
			let os = await Model.findOrFail(ID)
			await os.load('items')

			const update_at_db = moment(os.updated_at).format()
			const update_at = moment(data.updated_at).format()

			if (update_at_db !== update_at) {
				nrErro = -100
				throw {
					success: false,
					message:
						'Transação abortada! Este registro foi alterado por outro usuário.',
				}
			}

			await ModelLancamento.query()
				.where('ordem_servico_id', os.id)
				.update({
					pessoa_id: data.pessoa_id,
					dCompetencia: data.dCompetencia,
					updated_at: moment(),
				})
				.transacting(trx ? trx : null)

			if (data.status !== os.status) {
				const status = {
					ordem_servico_id: os.id,
					user_id: auth.user.id,
					motivo: 'Alteração de status',
					status: data.status,
				}
				await ModelStatus.create(status, trx ? trx : null)
			}

			const modelOsConfig = await ModelOSConfig.findOrFail(os.config_id)

			let isEstoqueEntrada = modelOsConfig.modelo === 'Entrada Estoque'
			let isEstoque = false

			if (!isEstoqueEntrada) {
				let modelItems = os.items().fetch()
				for (const key in modelItems) {
					if (Object.hasOwnProperty.call(modelItems, key)) {
						const item = modelItems[key]
						if (item.estoque_id) {
							isEstoque = true
						}
					}
				}

				/*for (const key in data['items']) {
					if (Object.hasOwnProperty.call(data['items'], key)) {
						const o = data['items'][key]
						if (o.estoque_id) {
							isEstoqueEntrada = true
						}
					}
				}*/
			}

			if (isEstoqueEntrada) {
				let itemsUpdate = []
				let itemsAdd = []
				let nAdd = 0
				let nUpdate = 0

				for (const key in data['items']) {
					if (Object.hasOwnProperty.call(data['items'], key)) {
						const o = data['items'][key]
						if (lodash.isNumber(o.id)) {
							if (o.id <= 0) {
								itemsAdd.push(o)
								nAdd++
							} else {
								itemsUpdate.push(o)
								nUpdate++
							}
						} else {
							itemsAdd.push(o)
							nAdd++
						}
					}
				}

				if (nAdd > 0) {
					let modelItemsAdd = await os
						.items()
						.createMany(itemsAdd, trx ? trx : null)

					for (const key in modelItemsAdd) {
						if (Object.hasOwnProperty.call(modelItemsAdd, key)) {
							const item = modelItemsAdd[key]
							for (let i = 0; i <= item.quantidade - 1; i++) {
								await ModelEstoque.query()
									.transacting(trx ? trx : null)
									.insert({
										descricao: item.descricao,
										subtotal: item.subtotal,
										total: item.subtotal,
										entrada_id: item.id,
										updated_at: moment().format(),
										created_at: moment().format(),
									})
							}
						}
					}
				}

				if (nUpdate > 0) {
					let modelItemsUpdate = await os.items().fetch()
					for (const key in modelItemsUpdate.rows) {
						if (Object.hasOwnProperty.call(modelItemsUpdate.rows, key)) {
							const item = modelItemsUpdate.rows[key]
							let busca = lodash.find(itemsUpdate, { id: item.id })
							let estoques = await item.estoques().fetch()

							if (!busca) {
								let queryEstoque = await ModelEstoque.query()
									.where('entrada_id', item.id)
									.whereNotNull('saida_id')
									.fetch()
								let qtdEstoque = queryEstoque.rows.length
								if (qtdEstoque > 0) {
									throw {
										message:
											'Não é possível excluir um item do estoque com status de baixado.',
									}
								}
								await ModelEstoque.query()
									.where('entrada_id', item.id)
									.whereNotNull('saida_id')
									.transacting(trx ? trx : null)
									.delete()

								await ModelItem.query()
									.where('id', item.id)
									.transacting(trx ? trx : null)
									.delete()
							}

							if (busca) {
								let queryEstoqueEntrada = await ModelEstoque.query()
									.where('entrada_id', item.id)
									.whereNull('saida_id')
									.fetch()
								let queryEstoqueSaida = await ModelEstoque.query()
									.where('entrada_id', item.id)
									.whereNotNull('saida_id')
									.fetch()
								let qtdEntradaEstoqueDB =
									queryEstoqueEntrada.rows.length
								let qtdSaidaEstoqueDB = queryEstoqueSaida.rows.length
								let qtdEstoqueDB =
									qtdEntradaEstoqueDB + qtdSaidaEstoqueDB

								if (item.quantidade === qtdEstoqueDB) {
									await ModelEstoque.query()
										.where('entrada_id', item.id)
										.transacting(trx ? trx : null)
										.update({
											descricao: busca.descricao,
											subtotal: busca.subtotal,
											total: busca.subtotal,
											updated_at: moment().format(),
										})
								}

								if (item.quantidade < qtdEstoqueDB) {
									let diffExcluir = qtdEstoqueDB - item.quantidade

									if (diffExcluir >= qtdEntradaEstoqueDB) {
										throw {
											message:
												'Não é possível excluir item(s) do estoque com status de baixado.',
										}
									}

									let itemsIDsExcluir = []
									let contador = 1

									for (const key in queryEstoqueEntrada.rows) {
										if (
											Object.hasOwnProperty.call(
												queryEstoqueEntrada.rows,
												key
											)
										) {
											const e = queryEstoqueEntrada.rows[key]
											if (contador <= diffExcluir) {
												itemsIDsExcluir.push(e.id)
												contador++
											}
										}
									}

									await ModelEstoque.query()
										.where('entrada_id', item.id)
										.whereNotIn('id', itemsIDsExcluir)
										.transacting(trx ? trx : null)
										.update({
											descricao: busca.descricao,
											subtotal: busca.subtotal,
											total: busca.subtotal,
											updated_at: moment().format(),
										})

									await ModelEstoque.query()
										.whereIn('id', itemsIDsExcluir)
										.transacting(trx ? trx : null)
										.delete()
								}

								if (item.quantidade > qtdEstoqueDB) {
									let nAddEstoque = qtdEstoqueDB - item.quantidade
									await ModelEstoque.query()
										.where('entrada_id', item.id)
										.whereNotIn('entrada_id', itemsIDsExcluir)
										.transacting(trx ? trx : null)
										.update({
											descricao: busca.descricao,
											subtotal: busca.subtotal,
											total: busca.subtotal,
											updated_at: moment().format(),
										})

									for (let i = 0; i <= nAddEstoque - 1; i++) {
										await ModelEstoque.query()
											.transacting(trx ? trx : null)
											.insert({
												quantidade: 1,
												descricao: busca.descricao,
												subtotal: busca.subtotal,
												total: busca.subtotal,
												entrada_id: item.id,
												updated_at: moment().format(),
												created_at: moment().format(),
											})
									}
								}

								if (busca.quantidade > item.quantidade) {
									// adicionar item e estoque
									let novaQuantidade =
										busca.quantidade - item.quantidade

									for (let i = 0; i <= novaQuantidade - 1; i++) {
										await ModelEstoque.query()
											.transacting(trx ? trx : null)
											.insert({
												quantidade: 1,
												descricao: busca.descricao,
												subtotal: busca.subtotal,
												total: busca.subtotal,
												entrada_id: busca.id,
												updated_at: moment().format(),
												created_at: moment().format(),
											})
									}
								}

								if (busca.quantidade < item.quantidade) {
									let diffExcluir = item.quantidade - busca.quantidade

									if (diffExcluir > qtdEntradaEstoqueDB) {
										throw {
											message:
												'Não é possível excluir item(s) do estoque com status de baixado.',
										}
									}

									let itemsIDsExcluir = []
									let contador = 1

									for (const key in queryEstoqueEntrada.rows) {
										if (
											Object.hasOwnProperty.call(
												queryEstoqueEntrada.rows,
												key
											)
										) {
											const e = queryEstoqueEntrada.rows[key]
											if (contador <= diffExcluir) {
												itemsIDsExcluir.push(e.id)
												contador++
											}
										}
									}
									await ModelEstoque.query()
										.whereIn('id', itemsIDsExcluir)
										.transacting(trx ? trx : null)
										.delete()
								}

								await ModelItem.query()
									.where('id', item.id)
									.transacting(trx ? trx : null)
									.update({
										quantidade: busca.quantidade,
										descricao: busca.descricao,
										subtotal: busca.subtotal,
										total: busca.total,
										updated_at: moment().format(),
									})
							}
						}
					}
				}
			}

			if (!isEstoqueEntrada) {
				let itemsUpdate = []
				let itemsAdd = []
				let nAdd = 0
				let nUpdate = 0

				for (const key in data['items']) {
					if (Object.hasOwnProperty.call(data['items'], key)) {
						const o = data['items'][key]
						if (lodash.isNumber(o.id)) {
							if (o.id <= 0) {
								itemsAdd.push(o)
								nAdd++
							} else {
								itemsUpdate.push(o)
								nUpdate++
							}
						} else {
							itemsAdd.push(o)
							nAdd++
						}
					}
				}

				if (nAdd > 0) {
					let modelItemsAdd = await os
						.items()
						.createMany(itemsAdd, trx ? trx : null)

					for (const key in modelItemsAdd) {
						if (Object.hasOwnProperty.call(modelItemsAdd, key)) {
							const item = modelItemsAdd[key]
							if (item.estoque_id) {
								let queryEstoqueDisponivel = await ModelEstoque.query()
									.where('id', item.estoque_id)
									.fetch()
								//.transacting(trx ? trx : null)

								if (queryEstoqueDisponivel.rows.length === 0) {
									throw {
										message:
											'Item a ser adicionado não está disponível no estoque. Item: ' +
											item.descricao,
									}
								}

								/*if (!lodash.isNull(queryEstoqueDisponivel.rows[0])) {
									throw {
										message:
											'Item a ser adicionado não está disponível no estoque. Item: ' +
											item.descricao,
									}
								}*/

								if (queryEstoqueDisponivel.rows.length > 0) {
									const nUpdates = await ModelEstoque.query()
										.where('id', item.estoque_id)
										.whereNull('saida_id')
										.transacting(trx ? trx : null)
										.update({
											saida_id: item.id,
											updated_at: moment().format(),
										})
									if (nUpdates === 0) {
										throw {
											message:
												'Não foi possível registrar no estoque.  Item: ' +
												item.descricao,
										}
									}
								}
							}
						}
					}
				}

				if (nUpdate => 0) {
					let modelItemsUpdate = await os.items().fetch()
					for (const key in modelItemsUpdate.rows) {
						if (Object.hasOwnProperty.call(modelItemsUpdate.rows, key)) {
							const item = modelItemsUpdate.rows[key]
							let busca = lodash.find(itemsUpdate, { id: item.id })

							if (!busca) {
								if (lodash.isNull(item.estoque_id)) {
									await ModelEstoque.query()
										.where('id', item.estoque_id)
										.transacting(trx ? trx : null)
										.update({
											saida_id: null,
											updated_at: moment().format(),
										})
								}

								// Limpar estoque_id para perder o relacionamento com o estoque
								await ModelItem.query()
									.where('id', item.id)
									.transacting(trx ? trx : null)
									.update({ estoque_id: null })

								// excluir o item
								await ModelItem.query()
									.where('id', item.id)
									.transacting(trx ? trx : null)
									.delete()
							}

							if (busca) {
								// Estoque
								if (!lodash.isNull(item.estoque_id)) {
									await ModelItem.query()
										.where('id', item.id)
										.transacting(trx ? trx : null)
										.update({
											quantidade: busca.quantidade,
											descricao: busca.descricao,
											subtotal: busca.subtotal,
											total: busca.total,
											estoque_id: busca.estoque_id,
											updated_at: moment().format(),
										})

									if (item.estoque_id !== busca.estoque_id) {
										await ModelEstoque.query()
											.where('id', item.estoque_id)
											.transacting(trx ? trx : null)
											.update({
												saida_id: null,
												updated_at: moment().format(),
											})
										let estoq = await ModelEstoque.query()
											.where('id', busca.estoque_id)
											.transacting(trx ? trx : null)
											.whereNull('saida_id')
											.update({
												saida_id: busca.id,
												updated_at: moment().format(),
											})
										if (estoq !== 1) {
											throw {
												message:
													'Não foi possível utilizar um item com status de baixado no estoque. Descrição: ' +
													busca.descricao,
											}
										}
									}
								}

								// Item sem estoque
								if (lodash.isNull(item.estoque_id)) {
									await ModelItem.query()
										.where('id', item.id)
										.transacting(trx ? trx : null)
										.update({
											quantidade: busca.quantidade,
											descricao: busca.descricao,
											subtotal: busca.subtotal,
											total: busca.total,
											estoque_id: busca.estoque_id,
											updated_at: moment().format(),
										})
								}
							}
						}
					}
				}
			}

			delete data['items']

			//const itemsDB = await os.items().fetch()

			os.merge(data)

			await os.save(trx ? trx : null)

			await trx.commit()
			//await trx.rollback()

			return await this.get(os.id)

			/*await os.load('config')
         await os.load('pessoa')
         await os.load('items')
         await os.load('user')
         await os.load('lancamentos')

         return os //itemsDB*/
		} catch (e) {
			await trx.rollback()

			if (nrErro) {
				if (nrErro === -100) {
					throw e
				}
			}
			throw {
				message: e.message,
				sqlMessage: e.sqlMessage,
				sqlState: e.sqlState,
				errno: e.errno,
				code: e.code,
			}
		}
	}

	async DELETAR_localizarPor(payload, parametros) {
		try {
			let res = null

			if (payload.opcao === 'ocorrencias') {
				res = await this.localizarOcorrencia(payload, parametros)
			}

			if (payload.opcao === 'terceiros') {
				res = await this.localizarTerceiro(payload)
			}

			if (payload.opcao === 'outros') {
				res = await this.localizarOutro(payload)
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

	async localizarPor(payload, parametros) {
		return new Promise(async (resolve, reject) => {
			let continuar = parametros.continue
			let start = parametros.start
			let count = parametros.count
			let pagina = parametros.pagina

			let field_name = payload.field_name
			let field_value = payload.field_value
			let field_value_status = payload.field_value_status
			let field_value_tipo = payload.field_value_tipo
			let inicio = null
			let fim = null
			if (payload.field_value_periodo) {
				inicio = payload.field_value_periodo.start
				fim = payload.field_value_periodo.end
			}
			let ordenar = payload.ordenar ? payload.ordenar : field_name // "id"

			let operador = '='

			try {
				const query = Database.select([
					'ordem_servicos.id',
					'ordem_servicos.dCompetencia',
					'ordem_servicos.ocorrencia_terceiro_id',
					'ordem_servicos.ocorrencia_id',
					'ordem_servicos.rateio_id',
					//'ordem_servicos.descricao',
					'ordem_servicos.status',
					'ordem_servicos.pessoa_id',
					'ordem_servicos.valorTotal',
					'ordem_servicos.isRatear',

					'ocorrencia_terceiros.id as terceiro_id',
					'ocorrencia_terceiros.nome as terceiro_nome',
					'ocorrencia_terceiros.placa as terceiro_placa',
					'ocorrencia_terceiros.atender as terceiro_atender',
					'ocorrencia_terceiros.status as terceiro_status',

					'ocorrencias.id as ocorrencia_id',
					'ocorrencias.status as ocorrencia_status',
					'ocorrencias.dEvento as ocorrencia_dEvento',
					'ocorrencia_pessoa.nome as ocorrencia_nome',
					'ocorrencias.qualPlaca as ocorrencia_qualPlaca',

					'pessoas.nome as pessoa_nome',
					'pessoas.tipo as pessoa_tipo',
					'pessoas.status as pessoa_status',

					'ordem_servicos.equipamento_id',

					'ocorrencias.equipamento_id as equipa_id',
					'equipamentos.status as equipa_status',
					'equipamentos.placa1 as equipa_placa1',
					'equipamentos.marca1 as equipa_marca1',
					'equipamentos.modelo1 as equipa_modelo1',
					'equipamentos.placa2 as equipa_placa2',
					'equipamentos.marca2 as equipa_marca2',
					'equipamentos.modelo2 as equipa_modelo2',
					'equipamentos.placa3 as equipa_placa3',
					'equipamentos.marca3 as equipa_marca3',
					'equipamentos.modelo3 as equipa_modelo3',

					'equipamento.status as equip_status',
					'equipamento.placa1 as equip_placa1',
					'equipamento.marca1 as equip_marca1',
					'equipamento.modelo1 as equip_modelo1',
					'equipamento.dAdesao as equipa_dAdesao',

					'os_configs.descricao as descricao',
					'os_configs.modelo as modelo',
				])
					.from('ordem_servicos')
					.distinct('ordem_servicos.id')
				query.leftOuterJoin(
					'ocorrencias',
					'ordem_servicos.ocorrencia_id',
					'ocorrencias.id'
				)
				query.leftOuterJoin(
					'equipamentos',
					'ocorrencias.equipamento_id',
					'equipamentos.id'
				)
				query.leftOuterJoin(
					'pessoas as ocorrencia_pessoa',
					'ocorrencias.pessoa_id',
					'ocorrencia_pessoa.id'
				)
				query.leftOuterJoin(
					'equipamentos as equipamento',
					'ordem_servicos.equipamento_id',
					'equipamento.id'
				)
				query.leftOuterJoin(
					'pessoas',
					'ordem_servicos.pessoa_id',
					'pessoas.id'
				)
				query.leftOuterJoin(
					'ocorrencia_terceiros',
					'ordem_servicos.ocorrencia_terceiro_id',
					'ocorrencia_terceiros.id'
				)
				query.leftOuterJoin(
					'os_configs',
					'ordem_servicos.config_id',
					'os_configs.id'
				)

				/*query.leftOuterJoin(
					'lancamentos',
					'ordem_servicos.id',
					'lancamentos.ordem_servico_id'
				)*/

				if (field_value_status) {
					switch (field_value_status) {
						case 'todos':
							break
						case 'em aberto':
						case 'em espera':
							query.whereIn('ordem_servicos.status', [
								'Em espera',
								'Em execução',
							])
							break
						case 'Finalizado':
							query.andWhere('ordem_servicos.status', 'Finalizado')
							break
						case 'Cancelado':
							query.andWhere('ordem_servicos.status', 'Cancelado')
							break
						case 'rateado':
							query.andWhere('ordem_servicos.rateio_id', '>', 0)
							break
						case 'nao-rateado':
							query.whereNull('ordem_servicos.rateio_id')
							query.andWhere('ordem_servicos.isRatear', 1)
							break
						case 'marcado-nao-ratear':
							query.andWhere('ordem_servicos.isRatear', 0)
							break
					}
				}

				switch (field_name) {
					case 'id_os':
						console.log('os_id ', field_value)
						query.where('ordem_servicos.id', field_value)
						break

					case 'ocorrencia_id':
						query.where('ordem_servicos.ocorrencia_id', field_value)
						break

					case 'tipo':
						query.where('ordem_servicos.config_id', field_value_tipo)
						//	query.whereNotIn('lancamentos.situacao', ['Cancelado'])
						break

					case 'nome':
						query.where(builder => {
							builder.orWhere(
								'ocorrencia_pessoa.nome',
								'like',
								'%' + field_value + '%'
							)
							builder.orWhere(
								'ocorrencia_terceiros.nome',
								'like',
								'%' + field_value + '%'
							)
							builder.orWhere(
								'pessoas.nome',
								'like',
								'%' + field_value + '%'
							)
						})
						/*query.orWhere('ocorrencia_pessoa.nome', 'like', '%' + field_value + '%')
                  query.orWhere('ocorrencia_terceiros.nome', 'like', '%' + field_value + '%')
                  query.orWhere('pessoas.nome', 'like', '%' + field_value + '%')*/
						break

					case 'terceiro':
						query.where(
							'ocorrencia_terceiros.nome',
							'like',
							'%' + field_value + '%'
						)
						break

					case 'fornecedor':
						query.where('pessoas.nome', 'like', '%' + field_value + '%')
						break

					case 'placa':
						query.where(builder => {
							builder.orWhere(
								'equipamentos.placa1',
								'like',
								'%' + field_value + '%'
							)
							builder.orWhere(
								'equipamento.placa1',
								'like',
								'%' + field_value + '%'
							)
							builder.orWhere(
								'ocorrencia_terceiros.placa',
								'like',
								'%' + field_value + '%'
							)
						})
						break

					case 'rateio_id':
						query.where('ordem_servicos.rateio_id', '=', field_value)
						break

					case 'competencia':
						query.whereBetween('dCompetencia', [inicio, fim])
						break
				}

				switch (ordenar) {
					case 'tipo':
						query.orderBy('equipamento.dAdesao', 'desc')
						break
					case 'id_os':
						query.orderBy('ordem_servicos.id', 'desc')
						break
					case 'dCompetencia':
						query.orderBy('ordem_servicos.dCompetencia', 'desc')
						break
					case 'tipo':
						query.orderBy('os_configs.descricao', 'asc')
						break
					case 'fornecedor':
						query.orderBy('ordem_servicos.id', 'desc')
						break
					case 'associado':
						query.orderBy('ocorrencia_pessoa.nome', 'asc')
						break
					case 'terceiro':
						query.orderBy('ocorrencia_terceiros.nome', 'asc')
						break
					case 'nome':
						query.orderBy('ocorrencia_pessoa.nome', 'asc')
						query.orderBy('ordem_servicos.id', 'desc')

						//query.orderBy([{ column: 'ocorrencia_terceiros.nome'}, { column: 'ordem_servicos.id', order: "desc"])
						break
				}

				let res = null
				let resData = []

				if (field_name === 'tipo') {
					res = await query //.forPage(pagina, count)
					res.forEach(e => (e.field_name = field_name))
					resData = res
				} else {
					res = await query.paginate(pagina, count)
					res.data.forEach(e => (e.field_name = field_name))
					resData = res.data
				}

				const retorno = {
					pos: continuar ? start : 0,
					total_count: res.total,
					data: resData,
				}

				resolve(retorno)
			} catch (e) {
				reject(e)
			}
		})
	}

	async localizarOcorrencia(payload, parametros) {
		return new Promise(async (resolve, reject) => {
			try {
				/*const paginacao = payload.paginacao
            delete payload.paginacao

            let continuar = false
            let page = paginacao.page
            let limit = paginacao.limit

            if (!lodash.isEmpty(parametros)) {
               console.log('parametros === ', parametros)
               continuar = parametros.continue
               console.log('contiunar = ', continuar)
            }

            if (parametros.start) {
               console.log('start ', parametros.start)
               console.log('count ', parametros.count)
               page = parametros.start / parametros.count + 1
               page = 2 //parseInt(page)
               //perPage = parametros.count
               limit = parametros.count
               console.log('nova pagina ', page)
            }*/

				const query = Database.select([
					'ordem_servicos.id',
					'ordem_servicos.dCompetencia',
					'ordem_servicos.ocorrencia_terceiro_id',
					'ordem_servicos.ocorrencia_id',
					//'ordem_servicos.descricao',
					'ordem_servicos.status',
					'ordem_servicos.pessoa_id',
					'ordem_servicos.valorTotal',

					'ocorrencias.id as ocorrencia_id',
					'ocorrencias.status as ocorrencia_status',
					'ocorrencias.dEvento as ocorrencia_dEvento',
					'ocorrencia_pessoa.nome as ocorrencia_nome',
					'ocorrencias.qualPlaca as ocorrencia_qualPlaca',

					'pessoas.nome as pessoa_nome',
					'pessoas.tipo as pessoa_tipo',
					'pessoas.status as pessoa_status',

					'ocorrencias.equipamento_id as equipa_id',
					'equipamentos.status as equipa_status',
					'equipamentos.placa1 as equipa_placa1',
					'equipamentos.marca1 as equipa_marca1',
					'equipamentos.modelo1 as equipa_modelo1',
					'equipamentos.placa2 as equipa_placa2',
					'equipamentos.marca2 as equipa_marca2',
					'equipamentos.modelo2 as equipa_modelo2',
					'equipamentos.placa3 as equipa_placa3',
					'equipamentos.marca3 as equipa_marca3',
					'equipamentos.modelo3 as equipa_modelo3',

					'equipamento.id as equipamento_id',
					'equipamento.status as equipamento_status',
					'equipamento.placa1 as equipamento_placa1',
					'equipamento.marca1 as equipamento_marca1',
					'equipamento.modelo1 as equipamento_modelo1',
					'equipamento.placa2 as equipamento_placa2',
					'equipamento.marca2 as equipamento_marca2',
					'equipamento.modelo2 as equipamento_modelo2',
					'equipamento.placa3 as equipamento_placa3',
					'equipamento.marca3 as equipamento_marca3',
					'equipamento.modelo3 as equipamento_modelo3',
					'equipamento.dAdesao as equipamento_dAdesao',
					'equipamento.categoria_id as equipamento_categoria_id',

					'os_configs.descricao as descricao',
				])
					.table('ordem_servicos')

					.leftOuterJoin(
						'ocorrencias',
						'ordem_servicos.ocorrencia_id',
						'ocorrencias.id'
					)
					.leftOuterJoin(
						'equipamentos',
						'ocorrencias.equipamento_id',
						'equipamentos.id'
					)
					.leftOuterJoin(
						'pessoas as ocorrencia_pessoa',
						'ocorrencias.pessoa_id',
						'ocorrencia_pessoa.id'
					)
					.leftOuterJoin(
						'equipamentos as equipamento',
						'ordem_servicos.equipamento_id',
						'equipamento.id'
					)
					.leftOuterJoin(
						'pessoas',
						'ordem_servicos.pessoa_id',
						'pessoas.id'
					)
					.leftOuterJoin(
						'os_configs',
						'ordem_servicos.config_id',
						'os_configs.id'
					)

				if (payload.field_name == 'ocorrencia-id') {
					console.log(payload)
					query
						.where('ocorrencias.id', '=', payload.field_value)
						.orderBy('ocorrencias.id')
						.orderBy('id', 'desc')
				}

				if (payload.field_name == 'ocorrencia-evento') {
					console.log(payload)
					query
						.where('ocorrencias.dEvento', '=', payload.field_value_data)

						.orderBy('ocorrencia_nome')
						.orderBy('id', 'desc')
				}

				if (payload.field_name == 'ocorrencia-associado') {
					query
						.where(
							'ocorrencia_pessoa.nome',
							'like',
							'%' + payload.field_value + '%'
						)
						.orderBy('ocorrencia_nome')
				}

				if (payload.field_name == 'ocorrencia-placa') {
					query
						.where(function () {
							this.where(
								'equipamentos.placa1',
								'like',
								'%' + payload.field_value.replace(/\W/g, '') + '%'
							).andWhere('ocorrencias.qualPlaca', 1)
							this.orWhere(
								'equipamentos.placa2',
								'like',
								'%' + payload.field_value.replace(/\W/g, '') + '%'
							).andWhere('ocorrencias.qualPlaca', 2)
							this.orWhere(
								'equipamentos.placa3',
								'like',
								'%' + payload.field_value.replace(/\W/g, '') + '%'
							).andWhere('ocorrencias.qualPlaca', 3)
						})
						.orderBy('ocorrencia_nome')
				}

				if (payload.field_name == 'ocorrencia-status') {
					query
						.where(
							'ordem_servicos.status',
							'like',
							payload.field_value_status
						)
						.orderBy('ocorrencia_nome')
						.orderBy('id', 'desc')
				}

				if (payload.field_name == 'ocorrencia-os-id') {
					query.where('ordem_servicos.id', '=', payload.field_value)
				}

				//query.whereNotNull('ordem_servicos.ocorrencia_terceiro_id')
				query.whereNotNull('ordem_servicos.ocorrencia_id')
				query.whereNull('ordem_servicos.ocorrencia_terceiro_id')

				const res = await query // paginate(page, limit)

				/*res.pos = res.page - 1
            res.total_count = res.total
            res.continue = continuar*/

				//console.log('resposta ', res)

				resolve({ success: true, data: res })
			} catch (e) {
				reject(e)
			}
		})
	}

	async localizarTerceiro(payload) {
		return new Promise(async (resolve, reject) => {
			try {
				//.distinct('age')
				const query = Database.select([
					'ordem_servicos.id',
					'ordem_servicos.dCompetencia',
					'ordem_servicos.ocorrencia_terceiro_id',
					'ordem_servicos.ocorrencia_id',
					//'ordem_servicos.descricao',
					'ordem_servicos.status',
					'ordem_servicos.pessoa_id',
					'ordem_servicos.valorTotal',

					'ocorrencia_terceiros.id as terceiro_id',
					'ocorrencia_terceiros.nome as terceiro_nome',
					'ocorrencia_terceiros.placa as terceiro_placa',
					'ocorrencia_terceiros.atender as terceiro_atender',
					'ocorrencia_terceiros.status as terceiro_status',

					'ocorrencias.id as ocorrencia_id',
					'ocorrencias.status as ocorrencia_status',
					'ocorrencias.dEvento as ocorrencia_dEvento',
					'ocorrencia_pessoa.nome as ocorrencia_nome',
					'ocorrencias.qualPlaca as ocorrencia_qualPlaca',

					'pessoas.nome as pessoa_nome',
					'pessoas.tipo as pessoa_tipo',
					'pessoas.status as pessoa_status',

					'ocorrencias.equipamento_id as equipa_id',
					'equipamentos.status as equipa_status',
					'equipamentos.placa1 as equipa_placa1',
					'equipamentos.marca1 as equipa_marca1',
					'equipamentos.modelo1 as equipa_modelo1',
					'equipamentos.placa2 as equipa_placa2',
					'equipamentos.marca2 as equipa_marca2',
					'equipamentos.modelo2 as equipa_modelo2',
					'equipamentos.placa3 as equipa_placa3',
					'equipamentos.marca3 as equipa_marca3',
					'equipamentos.modelo3 as equipa_modelo3',

					'os_configs.descricao as descricao',
				])
					.table('ordem_servicos')

					.leftOuterJoin(
						'ocorrencias',
						'ordem_servicos.ocorrencia_id',
						'ocorrencias.id'
					)
					.leftOuterJoin(
						'equipamentos',
						'ocorrencias.equipamento_id',
						'equipamentos.id'
					)
					.leftOuterJoin(
						'pessoas as ocorrencia_pessoa',
						'ocorrencias.pessoa_id',
						'ocorrencia_pessoa.id'
					)
					.leftOuterJoin(
						'pessoas',
						'ordem_servicos.pessoa_id',
						'pessoas.id'
					)
					.leftOuterJoin(
						'ocorrencia_terceiros',
						'ordem_servicos.ocorrencia_terceiro_id',
						'ocorrencia_terceiros.id'
					)
					.leftOuterJoin(
						'os_configs',
						'ordem_servicos.config_id',
						'os_configs.id'
					)

				if (payload.field_name == 'terceiro-placa') {
					query.where(
						'ocorrencia_terceiros.placa',
						'like',
						'%' + payload.field_value.replace(/\W/g, '') + '%'
					)
				}

				if (payload.field_name == 'terceiro-id') {
					query.where('ocorrencia_terceiros.id', '=', payload.field_value)
				}

				if (payload.field_name == 'terceiro-nome') {
					query
						.where(
							'ocorrencia_terceiros.nome',
							'like',
							'%' + payload.field_value + '%'
						)
						.orderBy('ocorrencia_nome')
				}

				if (payload.field_name == 'terceiro-status') {
					query.where(
						'ordem_servicos.status',
						'=',
						payload.field_value_status
					)
				}

				if (payload.field_name == 'terceiro-associado') {
					query.where(
						'ocorrencia_pessoa.nome',
						'like',
						'%' + payload.field_value + '%'
					)
				}

				if (payload.field_name == 'terceiro-os-id') {
					query.where('ordem_servicos.id', '=', payload.field_value)
				}

				query.whereNotNull('ordem_servicos.ocorrencia_terceiro_id')
				//query.whereNotNull('ordem_servicos.ocorrencia_id')

				const res = await query //.paginate(1, 10)

				resolve({ success: true, data: res })
			} catch (e) {
				reject(e)
			}
		})
	}

	async localizarOutro(payload) {
		return new Promise(async (resolve, reject) => {
			try {
				const query = Database.select([
					'ordem_servicos.id',
					'ordem_servicos.dCompetencia',
					'ordem_servicos.ocorrencia_terceiro_id',
					'ordem_servicos.ocorrencia_id',
					'ordem_servicos.equipamento_id',
					//'ordem_servicos.descricao',
					'ordem_servicos.status',
					'ordem_servicos.pessoa_id',
					'ordem_servicos.valorTotal',

					'ocorrencias.id as ocorrencia_id',
					'ocorrencias.status as ocorrencia_status',
					'ocorrencias.dEvento as ocorrencia_dEvento',
					'ocorrencia_pessoa.nome as ocorrencia_nome',
					'ocorrencias.qualPlaca as ocorrencia_qualPlaca',

					'ocorrencia_terceiros.id as terceiro_id',
					'ocorrencia_terceiros.nome as terceiro_nome',
					'ocorrencia_terceiros.placa as terceiro_placa',
					'ocorrencia_terceiros.atender as terceiro_atender',
					'ocorrencia_terceiros.status as terceiro_status',

					'pessoas.nome as pessoa_nome',
					'pessoas.tipo as pessoa_tipo',
					'pessoas.status as pessoa_status',

					'ocorrencias.equipamento_id as equipa_id',
					'equipamentos.status as equipa_status',
					'equipamentos.placa1 as equipa_placa1',
					'equipamentos.marca1 as equipa_marca1',
					'equipamentos.modelo1 as equipa_modelo1',
					'equipamentos.placa2 as equipa_placa2',
					'equipamentos.marca2 as equipa_marca2',
					'equipamentos.modelo2 as equipa_modelo2',
					'equipamentos.placa3 as equipa_placa3',
					'equipamentos.marca3 as equipa_marca3',
					'equipamentos.modelo3 as equipa_modelo3',

					'equipamento.id as equipamento_id',
					'equipamento.status as equipamento_status',
					'equipamento.placa1 as equipamento_placa1',
					'equipamento.marca1 as equipamento_marca1',
					'equipamento.modelo1 as equipamento_modelo1',
					'equipamento.placa2 as equipamento_placa2',
					'equipamento.marca2 as equipamento_marca2',
					'equipamento.modelo2 as equipamento_modelo2',
					'equipamento.placa3 as equipamento_placa3',
					'equipamento.marca3 as equipamento_marca3',
					'equipamento.modelo3 as equipamento_modelo3',
					'equipamento.dAdesao as equipamento_dAdesao',
					'equipamento.categoria_id as equipamento_categoria_id',

					'os_configs.descricao as descricao',
				])
					.table('ordem_servicos')

					.leftOuterJoin(
						'ocorrencias',
						'ordem_servicos.ocorrencia_id',
						'ocorrencias.id'
					)
					.leftOuterJoin(
						'equipamentos',
						'ocorrencias.equipamento_id',
						'equipamentos.id'
					)
					.leftOuterJoin(
						'pessoas as ocorrencia_pessoa',
						'ocorrencias.pessoa_id',
						'ocorrencia_pessoa.id'
					)
					.leftOuterJoin(
						'pessoas',
						'ordem_servicos.pessoa_id',
						'pessoas.id'
					)
					.leftOuterJoin(
						'equipamentos as equipamento',
						'ordem_servicos.equipamento_id',
						'equipamento.id'
					)
					.leftOuterJoin(
						'ocorrencia_terceiros',
						'ordem_servicos.ocorrencia_terceiro_id',
						'ocorrencia_terceiros.id'
					)
					.leftOuterJoin(
						'os_configs',
						'ordem_servicos.config_id',
						'os_configs.id'
					)

				if (payload.field_name == 'outros-os-id') {
					query.where('ordem_servicos.id', '=', payload.field_value)
				}

				if (payload.field_name == 'outros-tipo') {
					query.where(
						'os_configs.descricao',
						'like',
						payload.field_value_tipo
					)
					query.andWhere(
						'ordem_servicos.status',
						'like',
						payload.field_value2
					)
				}

				if (payload.field_name == 'outros-nome') {
					query
						.where(
							'pessoas.nome',
							'like',
							'%' + payload.field_value + '%'
						)
						.orderBy('pessoas.nome')
						.orderBy('ordem_servicos.id')
				}

				if (payload.field_name == 'outros-status') {
					query.where(
						'ordem_servicos.status',
						'=',
						payload.field_value_status
					)
				}

				if (payload.field_name == 'outros-periodo') {
					query.whereBetween('ordem_servicos.dCompetencia', [
						payload.field_value_periodo.start.substr(0, 10),
						payload.field_value_periodo.end.substr(0, 10),
					])
				}

				query.whereNull('ordem_servicos.ocorrencia_terceiro_id')
				query.whereNull('ordem_servicos.ocorrencia_id')

				const res = await query //.paginate(1, 20)

				resolve({ success: true, data: res })
			} catch (e) {
				reject(e)
			}
		})
	}

	async localizarBeneficiosTerceirosAssist24h(payload) {
		return new Promise(async (resolve, reject) => {
			try {
				let dStart = null
				let dEnd = null

				if (payload.field_value_periodo) {
					dStart = payload.field_value_periodo.start
					dEnd = payload.field_value_periodo.end
				}

				const modelConfig = await ModelOSConfig.query()
					.whereIn('modelo', ['Assistencia 24h', 'Terceiro'])
					.fetch()

				const config = []
				modelConfig.rows.forEach(o => {
					config.push(o.id)
				})

				const modelOS = await Model.query()
					.whereIn('config_id', config)
					.whereBetween('dCompetencia', [dStart, dEnd])
					.whereNot('status', 'Cancelado')
					.with('pessoa')
					.with('equipamento')
					.with('equipamento.categoria')
					.with('equipamento.equipamentoBeneficios')
					.with('equipamento.equipamentoBeneficios.beneficio')
					.with('ocorrencia')
					.with('ocorrencia.equipamento.categoria')
					.with('ocorrencia.equipamento.categoria')
					.with('ocorrencia.equipamento.equipamentoBeneficios')
					.with('ocorrencia.equipamento.equipamentoBeneficios.beneficio')
					.with('terceiro')
					.fetch()

				const json = modelOS.toJSON()
				const arr = []

				for (const key in json) {
					if (Object.hasOwnProperty.call(json, key)) {
						const os = json[key]
						const o = {
							id: os.id,
							status: os.status,
							dCompetencia: os.dCompetencia
								? moment(os.dCompetencia, 'YYYY-MM-DD').format(
										'DD/MM/YYYY'
								  )
								: '',
							valorTotal: os.isCredito
								? os.valorTotal * -1
								: os.valorTotal,
							pessoa_nome: os.pessoa ? os.pessoa.nome : '',
							ocorrencia_id: '',
							ocorrencia_dEvento: '',
							ocorrencia_tipoAcidente: '',
							placa: '',
							equipamento: '',
							anoModelo: '',
							categoria: '',
							beneficios: '',
							terceiro_nome: '',
							terceiro_id: '',
							terceiro_patrimonio: '',
							terceiro_placa: '',
						}

						let equipa = null
						let ordemPlaca = 1

						if (os.ocorrencia) {
							equipa = os.ocorrencia.equipamento
							o.ocorrencia_id = os.ocorrencia.id
							o.ocorrencia_dEvento = os.ocorrencia.dEvento
								? moment(os.ocorrencia.dEvento, 'YYYY-MM-DD').format(
										'DD/MM/YYYY'
								  )
								: ''
							o.ocorrencia_tipoAcidente = os.ocorrencia.tipoAcidente
							ordemPlaca = os.ocorrencia.qualPlaca
						} else {
							equipa = os.equipamento
						}

						if (equipa) {
							o.categoria = equipa.categoria.abreviado
							switch (ordemPlaca) {
								case 1:
									o.placa = equipa.placa1
										? equipa.placa1.length > 5
											? equipa.placa1.substr(0, 3) +
											  '-' +
											  equipa.placa1.substr(3)
											: equipa.placa1
										: equipa.placa1
									o.equipamento = equipa.marca1 + ' ' + equipa.modelo1
									o.anoModelo = equipa.anoF1 + '/' + equipa.modeloF1
									break

								case 2:
									o.placa = equipa.placa2
										? equipa.placa2.length > 5
											? equipa.placa2.substr(0, 3) +
											  '-' +
											  equipa.placa2.substr(3)
											: equipa.placa2
										: equipa.placa2

									o.equipamento = equipa.marca2 + ' ' + equipa.modelo2
									o.anoModelo = equipa.anoF2 + '/' + equipa.modeloF2
									break
								case 3:
									o.placa = equipa.placa3
										? equipa.placa3.length > 5
											? equipa.placa3.substr(0, 3) +
											  '-' +
											  equipa.placa3.substr(3)
											: equipa.placa3
										: equipa.placa3
									o.equipamento = equipa.marca3 + ' ' + equipa.modelo3
									o.anoModelo = equipa.anoF3 + '/' + equipa.modeloF3
									break
							}

							for (const keyB in equipa.equipamentoBeneficios) {
								if (
									Object.hasOwnProperty.call(
										equipa.equipamentoBeneficios,
										keyB
									)
								) {
									const b = equipa.equipamentoBeneficios[keyB]
									if (b.status === 'Ativo') {
										if (!lodash.isEmpty(o.beneficios)) {
											o.beneficios = o.beneficios + '|'
										}
										o.beneficios += b.beneficio.descricao
									}
								}
							}

							if (os.terceiro) {
								o.terceiro_nome = os.terceiro.nome
								o.terceiro_id = os.terceiro.id
								o.terceiro_patrimonio = os.terceiro.patrimonio
									? os.terceiro.patrimonio
									: os.terceiro.equipamento
								o.terceiro_placa = os.terceiro.placa
							}
						}

						arr.push(o)
					}
				}

				resolve(arr)
			} catch (e) {
				reject(e)
			}
		})
	}
}

module.exports = OrdemServico
