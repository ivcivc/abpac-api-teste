'use strict'

const Model = use('App/Models/EquipamentoBeneficio')
const ModelStatus = use('App/Models/EquipamentoBeneficioStatus')
const ModelEquipamentoControle = use('App/Models/EquipamentoControle')
const lodash = require('lodash')
const ModelBeneficio = use('App/Models/Beneficio')
const ModelEquipamentoBeneficioLog = use('App/Models/EquipamentoBeneficioLog')
const ModelEquipamento = use('App/Models/Equipamento')

const moment = require('moment')
const { findOrFail } = require('../Models/Beneficio')

class EquipamentoBeneficio {
	async add(data, trx, auth, oldEquipamento = null, isControle = true) {
		try {
			const model = await Model.create(data, trx ? trx : null)

			let modelEquipamento

			if (oldEquipamento) {
				modelEquipamento = oldEquipamento
			} else {
				modelEquipamento = await ModelEquipamento.findOrFail(
					data.equipamento_id
				)
			}

			// status beneficio
			const status = {
				equipamento_beneficio_id: model.id,
				user_id: auth.user.id,
				motivo: 'Inclusão de registro',
				status: model.status,
			}
			await ModelStatus.create(status, trx ? trx : null)

			// Controle ação
			if (isControle) {
				let modelBeneficio = await ModelBeneficio.findOrFail(
					model.beneficio_id
				)
				await ModelEquipamentoControle.create(
					{
						descricao: modelBeneficio.descricao,
						motivo:
							model.status === 'Ativo'
								? 'Inclusão de Benefício'
								: 'Remoção de Benefício',
						acao: model.status === 'Ativo' ? 'INCLUSÃO' : 'REMOÇÃO',
						tipo: 'BENEFICIO',
						obs: '',
						status: 'PENDENTE',
						pessoa_id: modelEquipamento.pessoa_id,
						equipamento_id: modelEquipamento.id,
						equipamento_protecao_id: null,
						equipamento_beneficio_id: model.id,
						user_id: auth.user.id,
					},
					trx
				)
			}

			return model
		} catch (e) {
			throw e
		}
	}

	async get(ID) {
		try {
			const model = await Model.findOrFail(ID)
			return model
		} catch (e) {
			throw e
		}
	}

	async index() {
		try {
			const model = await Model.query()
				.with('equipamentoBeneficioStatuses')
				.fetch()

			return model
		} catch (e) {
			throw e
		}
	}

	async update(ID, data, trx, auth) {
		try {
			let model = await Model.findOrFail(ID)

			data.beneficio_id = parseInt(data.beneficio_id)
			data.dTermino = data.dTermino == '' ? null : data.dTermino

			const modelEquipamento = await ModelEquipamento.findOrFail(
				data.equipamento_id
			)

			let oStatus = null

			if (model.status !== data.status) {
				const dTermino = lodash.isEmpty(model.dTermino)
					? ''
					: ' Termino: ' +
					  moment(model.dTermino, 'DD-MM-YYYY')
							.toISOString()
							.substr(0, 10)
				const dTerminoNovo = lodash.isEmpty(data.dTermino)
					? ''
					: ' Termino: ' + data.dTermino.substr(0, 10)
				const dInicioModel = moment(model.dInicio, 'DD-MM-YYYY')
					.toISOString()
					.substr(0, 10)
				let m = `Para: Status:${data.status} Entrada: ${data.dInicio.substr(
					0,
					10
				)} ${dTerminoNovo}`
				oStatus = {
					equipamento_beneficio_id: model.id,
					user_id: auth.user.id,
					motivo: `De: Status:${model.status} Entrada: ${dInicioModel} ${dTermino} - ${m}`,
					status: data.status,
				}
			}

			// Controle (ação)
			if (model.status !== data.status) {
				let modelBeneficio = await ModelBeneficio.findOrFail(
					model.beneficio_id
				)

				await ModelEquipamentoControle.create(
					{
						descricao: modelBeneficio.descricao,
						motivo:
							model.status === 'Ativo'
								? 'Remoção de Benefício'
								: 'Inclusão de Benefício',
						acao: model.status === 'Ativo' ? 'REMOÇÃO' : 'INCLUSÃO',
						tipo: 'BENEFICIO',
						obs: '',
						status: 'PENDENTE',
						pessoa_id: modelEquipamento.pessoa_id,
						equipamento_id: modelEquipamento.id,
						equipamento_protecao_id: null,
						equipamento_beneficio_id: model.id,
						user_id: auth.user.id,
					},
					trx
				)
			}

			model.merge(data)

			await this.addLog(model, auth, trx)

			await model.save(trx ? trx : null)

			if (oStatus) {
				await ModelStatus.create(oStatus, trx ? trx : null)
			}

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

	async addLog(data, auth = null, trx = null) {
		try {
			const benefOld = await ModelBeneficio.findOrFail(
				data.$originalAttributes['beneficio_id']
			)
			const benefNovo = await ModelBeneficio.findOrFail(
				data.$attributes['beneficio_id']
			)

			const arr = Object.keys(data.dirty)
			for (const key in arr) {
				if (Object.hasOwnProperty.call(arr, key)) {
					const field = arr[key]
					let novo = data.$attributes[field]
					let original = data.$originalAttributes[field]

					let o = null

					switch (field) {
						case 'created_at':
							break
						case 'updated_at':
							if (
								moment(novo, 'YYYY-MM-DD hh:mm:ss').toJSON() !==
								moment(original, 'YYYY-MM-DD').toJSON()
							) {
								o = {
									field: 'updated_at',
									valueOld: moment(original).format(
										'DD/MM/YYYY hh:mm:ss'
									),
									valueNew: moment(novo, 'YYYY-MM-DD hh:mm:ss').format(
										'DD/MM/YYYY hh:mm:ss'
									),
									equipamento_beneficio_id:
										data.$originalAttributes['id'],
									user_id: auth.user.id,
								}
							}
							break

						case 'status':
							if (novo !== original) {
								o = {
									field: 'Status',
									valueOld: original,
									valueNew: novo,
									equipamento_beneficio_id:
										data.$originalAttributes['id'],
									user_id: auth.user.id,
								}
							}
							break

						case 'beneficio_id':
							if (novo !== original) {
								o = {
									field: 'Código',
									valueOld: benefOld.descricao,
									valueNew: benefNovo.descricao,
									equipamento_beneficio_id:
										data.$originalAttributes['id'],
									user_id: auth.user.id,
								}
							}
							break

						case 'dInicio':
							if (
								moment(novo, 'YYYY-MM-DD').format('YYYY-MM-DD') !==
								moment(original, 'YYYY-MM-DD').format('YYYY-MM-DD')
							) {
								o = {
									field: 'Data Inicio',
									valueOld: moment(original, 'YYYY-MM-DD').format(
										'DD/MM/YYYY'
									),
									valueNew: moment(novo, 'YYYY-MM-DD').format(
										'DD/MM/YYYY'
									),
									equipamento_beneficio_id:
										data.$originalAttributes['id'],
									user_id: auth.user.id,
								}
							}
							break

						case 'dTermino':
							if (
								moment(novo, 'YYYY-MM-DD').format('YYYY-MM-DD') !==
								moment(original, 'YYYY-MM-DD').format('YYYY-MM-DD')
							) {
								o = {
									field: 'Data Termino',
									valueOld: moment(original, 'YYYY-MM-DD').format(
										'DD/MM/YYYY'
									),
									valueNew: moment(novo, 'YYYY-MM-DD').format(
										'DD/MM/YYYY'
									),
									equipamento_beneficio_id:
										data.$originalAttributes['id'],
									user_id: auth.user.id,
								}
							}
							break

						default:
							let isVisible = true

							if (novo !== original) {
								o = {
									field: field,
									valueOld: original,
									valueNew: novo,
									equipamento_beneficio_id:
										data.$originalAttributes['id'],
									user_id: auth.user.id,
									isVisible,
								}
							}
							break
					}

					if (o) {
						await ModelEquipamentoBeneficioLog.create(o, trx ? trx : null)
					}

					o = null
				}
			}
		} catch (e) {
			throw e
		}
	}

	async del(ID, trx) {
		return new Promise(async (resolve, reject) => {
			try {
				const model = await Model.findOrFail(ID)

				await model
					.equipamentoBeneficioStatuses()
					.where('equipamento_beneficio_id', ID)
					//.transacting(trx ? trx : null)
					.delete()

				await model.delete(trx ? trx : null)

				resolve(model)
			} catch (e) {
				reject(e)
			}
		})
	}

	async getLog(equipamento_beneficio_id) {
		try {
			const log = await ModelEquipamentoBeneficioLog.query()
				.where('equipamento_beneficio_id', equipamento_beneficio_id)
				.with('user')
				.fetch()

			return log
		} catch (e) {
			throw e
		}
	}
}

module.exports = EquipamentoBeneficio
