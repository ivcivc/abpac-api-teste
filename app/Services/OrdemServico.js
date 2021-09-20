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

			await os.items().createMany(items, trx ? trx : null)

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

			/**if (data.status !== os.status) {
            if (os.status !== 'Finalizado' && data.status === 'Finalizado') {
               await ModelLancamento.query()
                  .where('ordem_servico_id', os.id)
                  .where('situacao', 'Aberto')
                  .update({
                     situacao: 'Aberto',
                     pessoa_id: data.pessoa_id,
                     updated_at: moment(),
                  })
                  .transacting(trx ? trx : null)
            }

            if (os.status === 'Finalizado') {
               let modelLancamentoArr = await Database.from('lancamentos')
                  .where('ordem_servico_id', os.id)
                  .whereNotIn('situacao', ['Bloqueado', 'Aberto'])
               //.fetch()
               if (modelLancamentoArr.length > 0) {
                  nrErro = -100
                  throw {
                     success: false,
                     message:
                        'Transação abortada! Não é possível alterar o status. Houve movimentação no financeiro.',
                  }
               }
               //  Database.from('lancamentos')
               await ModelLancamento.query()
                  .where('ordem_servico_id', os.id)
                  .update({
                     situacao: 'Bloqueado',
                     pessoa_id: data.pessoa_id,
                     updated_at: moment(),
                  })
                  .transacting(trx ? trx : null)
            }
         } else {
            if ( data.status === 'Finalizado') {
               await ModelLancamento.query()
                  .where('ordem_servico_id', os.id)
                  .where('situacao', 'Bloqueado')
                  .update({
                     situacao: 'Aberto',
                     pessoa_id: data.pessoa_id,
                     updated_at: moment(),
                  })
                  .transacting(trx ? trx : null)
            }
            if (data.pessoa_id !== os.pessoa_id) {
               await ModelLancamento.query()
                  .where('ordem_servico_id', os.id)
                  .update({ pessoa_id: data.pessoa_id, updated_at: moment() })
                  .transacting(trx ? trx : null)
            }
         }**/

			if (data.status !== os.status) {
				const status = {
					ordem_servico_id: os.id,
					user_id: auth.user.id,
					motivo: 'Alteração de status',
					status: data.status,
				}
				await ModelStatus.create(status, trx ? trx : null)
			}

			let items = data['items']
			items.forEach(e => {
				delete e['id']
			})
			delete data['items']

			const itemsDB = await os.items().fetch()

			let estoque = {}
			let itemsDeletar = []

			os.merge(data)

			itemsDB.rows.forEach(e => {
				if (e.estoque_id) {
					if (estoque[e.estoque_id]) {
						if (estoque[e.estoque_id].delete) {
							estoque[e.estoque_id].delete =
								estoque[e.estoque_id].delete + e.quantidade
						} else {
							estoque[e.estoque_id].delete = e.quantidade
						}
					} else {
						estoque[e.estoque_id] = { delete: e.quantidade }
					}
				}
			})

			items.forEach(e => {
				if (e.estoque_id) {
					if (estoque[e.estoque_id]) {
						if (estoque[e.estoque_id].update) {
							estoque[e.estoque_id].update =
								estoque[e.estoque_id].update + e.quantidade
						} else {
							estoque[e.estoque_id].update = e.quantidade
						}
					} else {
						estoque[e.estoque_id] = { update: e.quantidade }
					}
				}
			})

			console.log('estoque ', estoque)

			const deletarItems = await os
				.items()
				.where('ordem_servico_id', os.id)
				.delete(trx ? trx : null)

			await os.items().createMany(items, trx ? trx : null)

			/* Adicionar aqui contas pagar/receber */

			await os.save(trx ? trx : null)

			await trx.commit()

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
}

module.exports = OrdemServico
