'use strict'
const lodash = require('lodash')

//const Model = use("App/Models/Equipamento");
const Equipamento = use('App/Models/Equipamento')
const Model = use('App/Models/EquipamentoProtecao')
const EquipamentoProtecaoStatus = use('App/Models/EquipamentoProtecaoStatus')
const LogProtecao = use('App/Models/LogProtecao')
const ModelEquipamentoControle = use('App/Models/EquipamentoControle')

const moment = require('moment')

const Database = use('Database')

class EquipamentoProtecao {
	async add(oConfig, protecoes, trx, auth) {
		try {
			let equipamento_id = oConfig.equipamento.id

			let arr = []

			if (protecoes) {
				for (let i = 0; i < protecoes.length; i++) {
					let item = protecoes[i]
					item.user_id = auth.user.id
					item.equipamento_id = equipamento_id
					const equipamentoProtecao = await Model.create(
						item,
						trx ? trx : null
					)

					arr.push(equipamentoProtecao.toJSON())

					// status protecao
					const status = {
						equipamento_protecao_id: equipamentoProtecao.id,
						user_id: auth.user.id,
						motivo: 'Inclusão de registro',
						status: item.status,
					}
					await EquipamentoProtecaoStatus.create(status, trx ? trx : null)

					await ModelEquipamentoControle.create(
						{
							descricao: equipamentoProtecao.tipo,
							motivo: oConfig.controle.motivo,
							acao: oConfig.controle.acao,
							tipo: equipamentoProtecao.tipo,
							obs: '',
							status: 'PENDENTE',
							pessoa_id: oConfig.equipamento.pessoa_id,
							equipamento_id: equipamento_id,
							equipamento_protecao_id: equipamentoProtecao.id,
							equipamento_beneficio_id: null,
							user_id: auth.user.id,
						},
						trx ? trx : null
					)
				}
			}
			return arr
		} catch (e) {
			throw e
		}
	}

	async update(equipamento_id, data, trx, auth) {
		try {
			let addStatus = null
			let protecao_id = null
			let protecao = null

			const query = await Model.query()
				.where('equipamento_id', '=', equipamento_id)
				.andWhere('tipo', 'like', data.tipo)
				.fetch()

			if (query.rows.length > 0) {
				protecao_id = query.rows[0].id
			}

			data.user_id = auth.user.id

			if (protecao_id) {
				protecao = await Model.findOrFail(protecao_id)
				data.id = protecao.id
				data.tipo = protecao.tipo

				const old = protecao.toJSON()
				if (old.dAtivacao) {
					old.dAtivacao = moment(old.dAtivacao, 'YYYY-MM-DD').format(
						'YYYY-MM-DD'
					)
				}
				if (old.dRemocao) {
					old.dRemocao = moment(old.dRemocao, 'YYYY-MM-DD').format(
						'YYYY-MM-DD'
					)
				}
				if (data.status !== 'Removido') {
					data.dRemocao = null
				}

				let statusAtual = protecao.status
				let updated_at = moment(protecao.updated_at).format(
					'YYYY-MM-DD h:mm:s'
				)
				let novoUpdated_at = moment(data.updated_at).format(
					'YYYY-MM-DD h:mm:s'
				)

				if (updated_at !== novoUpdated_at) {
					throw { message: 'Registro alterado por outro usuário.' }
				}

				if (data.status !== statusAtual) {
					addStatus = {
						equipamento_protecao_id: protecao.id,
						motivo: `De: ${statusAtual} para: ${data.status}`,
						status: data.status,
					}
					if (data.status === 'Removido') {
						let dDRemocao = moment(data.dRemocao).format(
							'YYYY-MM-DD h:mm:s'
						)
						addStatus.motivo =
							addStatus.motivo + ` Data remoção: ${dDRemocao}`
					}

					protecao.status = data.status
				}

				protecao.merge(data)

				if (protecao.isDirty) {
					if (old.dono !== data.dono) {
						await LogProtecao.create(
							{
								field: 'Dono',
								valueOld: old.dono,
								valueNew: data.dono,
								equipamento_protecao_id: old.id,
								user_id: auth.user.id,
							},
							trx ? trx : null
						)
					}

					let dAtivacao = moment(data.dAtivacao, 'YYYY-MM-DD').format(
						'YYYY-MM-DD'
					)

					if (old.dAtivacao !== dAtivacao) {
						await LogProtecao.create(
							{
								field: 'Data Ativação',
								valueOld: old.dAtivacao,
								valueNew: dAtivacao,
								equipamento_protecao_id: old.id,
								user_id: auth.user.id,
							},
							trx ? trx : null
						)
					}

					let dRemocao = data.dRemocao
						? moment(data.dRemocao, 'YYYY-MM-DD').format('YYYY-MM-DD')
						: null

					if (old.dRemocao !== dRemocao) {
						await LogProtecao.create(
							{
								field: 'Data Remoção',
								valueOld: old.dRemocao,
								valueNew: dRemocao,
								equipamento_protecao_id: old.id,
								user_id: auth.user.id,
							},
							trx ? trx : null
						)
					}
					if (old.nrSerie !== data.nrSerie) {
						await LogProtecao.create(
							{
								field: 'Nr.Série',
								valueOld: old.nrSerie,
								valueNew: data.nrSerie,
								equipamento_protecao_id: old.id,
								user_id: auth.user.id,
							},
							trx ? trx : null
						)
					}
					if (old.local !== data.local) {
						await LogProtecao.create(
							{
								field: 'Local',
								valueOld: old.local,
								valueNew: data.local,
								equipamento_protecao_id: old.id,
								user_id: auth.user.id,
							},
							trx ? trx : null
						)
					}
					if (old.status !== data.status) {
						await LogProtecao.create(
							{
								field: 'Status',
								valueOld: old.status,
								valueNew: data.status,
								equipamento_protecao_id: old.id,
								user_id: auth.user.id,
							},
							trx ? trx : null
						)
					}
					if (old.equipamento_id !== data.equipamento_id) {
						await LogProtecao.create(
							{
								field: 'equipamento_id',
								valueOld: old.equipamento_id,
								valueNew: data.equipamento_id,
								equipamento_protecao_id: old.id,
								user_id: auth.user.id,
							},
							trx ? trx : null
						)
					}
					if (old.obs !== data.obs) {
						await LogProtecao.create(
							{
								field: 'Observações',
								valueOld: old.obs,
								valueNew: data.obs,
								equipamento_protecao_id: old.id,
								user_id: auth.user.id,
							},
							trx ? trx : null
						)
					}
				}

				await protecao.save(trx ? trx : null)
			}

			if (!protecao_id) {
				protecao = await Model.create(data, trx ? trx : null)
				addStatus = {
					equipamento_protecao_id: protecao.id,
					motivo: `Inclusão do status "${protecao.status}"`,
					status: protecao.status,
				}

				let equipa = await Equipamento.findOrFail(equipamento_id)

				await ModelEquipamentoControle.create(
					{
						descricao: data.tipo,
						motivo: 'Inclusão de Proteção',
						acao: 'INCLUSÃO',
						tipo: data.tipo,
						obs: '',
						status: 'PENDENTE',
						pessoa_id: equipa.pessoa_id,
						equipamento_id: equipamento_id,
						equipamento_protecao_id: protecao.id,
						equipamento_beneficio_id: null,
						user_id: auth.user.id,
					},
					trx ? trx : null
				)
			}

			if (addStatus) {
				addStatus.user_id = auth.user.id
				await EquipamentoProtecaoStatus.create(addStatus, trx ? trx : null)
			}

			//await protecao.load('equipamento')

			return protecao
		} catch (e) {
			throw e
		}
	}

	async get(ID) {
		try {
			const protecao = await Model.findOrFail(ID)

			//protecao.load('equipamentoProtecaoStatuses')

			return protecao
		} catch (e) {
			throw e
		}
	}

	async localizarPorMarca(payload = null) {
		try {
			const q = Database.select([
				'bloqueador_localizadors.id as marca_id',
				'bloqueador_localizadors.nome as marca',
				'bloqueador_localizadors.tipo as tipo',
				'bloqueador_localizadors.status',
				'equipamento_protecaos.nrSerie as protecao_nrSerie',
				'equipamento_protecaos.dAtivacao as protecao_dAtivacao',
				'equipamento_protecaos.status as protecao_status',
				'equipamentos.id as equipa_id',
				'equipamentos.dAdesao as equipa_dAdesao',
				'equipamentos.placa1 as equipa_placa',
				'equipamentos.marca1 as equipa_marca',
				'equipamentos.modelo1 as equipa_modelo',
				'equipamentos.anoF1 as equipa_anoF',
				'equipamentos.modeloF1 as equipa_modeloF',
				'equipamentos.status as equipa_status',
				'pessoas.nome as pessoa_nome',
				'categorias.abreviado as categoria_abreviado',
			])
				.from('bloqueador_localizadors')
				.leftOuterJoin(
					'equipamento_protecaos',
					'bloqueador_localizadors.id',
					'equipamento_protecaos.bloqueador_localizador_id'
				)
				.innerJoin(
					'equipamentos',
					'equipamento_protecaos.equipamento_id',
					'equipamentos.id'
				)
				.innerJoin('pessoas', 'equipamentos.pessoa_id', 'pessoas.id')
				.innerJoin(
					'categorias',
					'equipamentos.categoria_id',
					'categorias.id'
				)
				.whereNotIn('equipamento_protecaos.status', [
					'Cancelado',
					'Removido',
					'Perdido',
				])

			if (payload.field_value_marca) {
				q.whereIn('bloqueador_localizadors.id', payload.field_value_marca)
				q.orderBy('bloqueador_localizadors.nome')
			} else {
				q.orderBy('bloqueador_localizadors.nome')
			}

			if (payload.field_value_tipo) {
				if (payload.field_value_tipo !== 'Ambos')
					q.where('bloqueador_localizadors.tipo', payload.field_value_tipo)
			}

			const query = await q

			for (const key in query) {
				if (Object.hasOwnProperty.call(query, key)) {
					const e = query[key]
					e.equipa_equipamento = e.equipa_marca + ' ' + e.equipa_modelo
					if (e.equipa_placa) {
						if (e.equipa_placa.length > 5) {
							let placa = `${e.equipa_placa}`
							placa = placa.substr(0, 3) + '-' + placa.substr(3)
							e.equipa_placa = placa.toUpperCase()
						}
					}
					if (e.equipa_dAdesao) {
						e.equipa_dAdesao = e.equipa_dAdesao
							? moment(e.equipa_dAdesao, 'YYYY-MM-DD').format(
									'DD/MM/YYYY'
							  )
							: ''
					}
					if (e.equipa_anoF) {
						e.equipa_anoModelo = e.equipa_anoF + '/' + e.equipa_modeloF
					} else {
						e.equipa_anoModelo = ''
					}
					if (e.protecao_dAtivacao) {
						e.protecao_dAtivacao = e.protecao_dAtivacao
							? moment(e.protecao_dAtivacao, 'YYYY-MM-DD').format(
									'DD/MM/YYYY'
							  )
							: ''
					}
				}
			}

			return query
		} catch (e) {
			throw e
		}
	}

	async localizarSemProtecao(payload = null) {
		try {
			const query = await Equipamento.query()
				.where('status', 'Ativo')
				.with('pessoa')
				.with('categoria')
				.with('equipamentoProtecoes')
				.fetch()

			const json = query.toJSON()
			const arr = []

			for (const key in json) {
				if (Object.hasOwnProperty.call(json, key)) {
					const e = json[key]
					const o = {
						id: e.id,
						pessoa_nome: e.pessoa.nome,
						categoria: e.categoria.abreviado,
						equipamento: e.marca1 + ' ' + e.modelo1,
						dAdesao: e.dAdesao
							? moment(e.dAdesao, 'YYYY-MM-DD').format('DD/MM/YYYY')
							: '',
						placa:
							e.placa1.length > 5
								? e.placa1.substr(0, 3) + '-' + e.placa1.substr(3)
								: e.placa1,
						anoModelo: e.anoF1 + '/' + e.modeloF1,
						localizador: '',
						bloqueador: '',
						status: e.status,
					}

					for (const keyProt in e.equipamentoProtecoes) {
						if (
							Object.hasOwnProperty.call(e.equipamentoProtecoes, keyProt)
						) {
							const p = e.equipamentoProtecoes[keyProt]
							if (
								p.status !== 'Removido' &&
								p.status !== 'Perdido' &&
								p.status !== 'Cancelado'
							) {
								if (p.tipo === 'Bloqueador') {
									o.bloqueador = p.status
								} else {
									o.localizador = p.status
								}
							}
						}
					}

					if (
						lodash.isEmpty(o.localizador) ||
						lodash.isEmpty(o.bloqueador)
					) {
						arr.push(o)
					}
				}
			}

			return arr
		} catch (e) {
			throw e
		}
	}

	async addStatus_DELETAR(data, trx, auth) {
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			data.user_id = auth.user.id

			const protecao = await Model.findOrFail(data.equipamento_protecao_id)
			protecao.status = data.status
			protecao.save(trx ? trx : null)

			const status = data
			await EquipamentoProtecaoStatus.create(status, trx ? trx : null)

			await trx.commit()

			await protecao.load('equipamentoProtecaoStatuses')

			return protecao
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}
}

module.exports = EquipamentoProtecao
