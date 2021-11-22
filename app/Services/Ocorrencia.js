'use strict'
const lodash = require('lodash')
const moment = require('moment')
const Model = use('App/Models/Ocorrencia')
const Terceiro = use('App/Models/OcorrenciaTerceiro')
const OcorrenciaStatus = use('App/Models/OcorrenciaStatus')
//const OcorrenciaTerceiroStatus = use("/App/Models/OcorrenciaTerceiroStatus")
const ModelTerceiroStatus = use('App/Models/OcorrenciaTerceiroStatus')
const FileConfig = use('App/Models/FileConfig')
const Galeria = use('App/Models/File')
const ModelConfig = use('App/Models/ordem_servico/OsConfig')
const ModelOS = use('App/Models/ordem_servico/OrdemServico')

const Database = use('Database')

class Ocorrencia {
	async update(ID, data, trx, auth) {
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			delete data['valorRealizado']
			delete data['ordemServicos']

			let ocorrencia = await Model.findOrFail(ID)

			let terceiros = null
			if (data.terceiros) {
				terceiros = data.terceiros
			}

			delete data['terceiros']

			if (ocorrencia.status != data.status) {
				const status = {
					ocorrencia_id: ocorrencia.id,
					user_id: auth.user.id,
					motivo: `De: ${ocorrencia.status} para: ${data.status}`,
					status: data.status,
				}
				//await terceiroModel.statuses().create(status, trx ? trx : null)
				await OcorrenciaStatus.create(status, trx ? trx : null)
			}

			ocorrencia.merge(data)

			if (terceiros) {
				if (terceiros.length > 0) {
					for (let i = 0; i < terceiros.length; i++) {
						if (terceiros[i].id) {
							const terceiro = await Terceiro.find(terceiros[i].id)
							terceiro.merge(terceiros[i])
							await terceiro.save(trx ? trx : null)
						} else {
							const terceiro = new Terceiro()
							terceiro.merge(terceiros[i])
							await terceiro.save(trx ? trx : null)
						}
					}
				}
			}

			await ocorrencia.save(trx ? trx : null)

			await ocorrencia.load('pessoa')
			await ocorrencia.load('terceiros')

			await trx.commit()

			return ocorrencia
		} catch (e) {
			await trx.rollback()
			throw {
				message: e.message,
				sqlMessage: e.sqlMessage,
				sqlState: e.sqlState,
				errno: e.errno,
				code: e.code,
			}
		}
	}

	async add(data, trx, auth) {
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			delete data['valorRealizado']
			delete data['ordemServicos']

			data.status = 'Aberto'

			let terceiros = []
			if (data.terceiros) {
				terceiros = data.terceiros
				delete data['terceiros']
			}

			const ocorrencia = await Model.create(data, trx ? trx : null)

			if (terceiros.length > 0) {
				const terceiroModel = await ocorrencia
					.terceiros()
					.createMany(terceiros, trx ? trx : null)
				for (const key in terceiroModel) {
					const status = {
						ocorrencia_terceiro_id: terceiroModel[key].id,
						user_id: auth.user.id,
						motivo: 'Inclusão de Terceiro',
						status: 'Aberto',
					}
					//await terceiroModel.statuses().create(status, trx ? trx : null)
					await ModelTerceiroStatus.create(status, trx ? trx : null)

					// Adicionar pendencia - Galeria
					const fileConfig = await FileConfig.query()
						.where('modulo', 'like', 'Terceiro')
						.fetch()

					for (const i in fileConfig.rows) {
						const payload = {
							descricao: fileConfig.rows[i].descricao,
							modulo: fileConfig.rows[i].modulo,
							idParent: terceiroModel[key].id,
							pessoa_id: null,
							status: 'Pendente',
						}
						const model = await Galeria.create(payload, trx)
					}
				}
			}

			const status = {
				ocorrencia_id: ocorrencia.id,
				user_id: auth.user.id,
				motivo: 'Inclusão de Ocorrência',
				status: 'Aberto',
			}
			await OcorrenciaStatus.create(status, trx ? trx : null)

			const fileConfig = await FileConfig.query()
				.where('modulo', 'like', 'Ocorrencia')
				.fetch()

			for (const i in fileConfig.rows) {
				const payload = {
					descricao: fileConfig.rows[i].descricao,
					modulo: fileConfig.rows[i].modulo,
					idParent: ocorrencia.id,
					pessoa_id: ocorrencia.pessoa_id,
					status: 'Pendente',
				}
				const model = await Galeria.create(payload, trx)
			}

			/*await ocorrencia.load('pessoa')
      await ocorrencia.load('equipamento')
      await ocorrencia.load('statuses')
      await ocorrencia.load('terceiros')*/

			await trx.commit()

			const query = await Model.query()
				.with('pessoa')
				.with('equipamento')
				.with('statuses')
				.with('terceiros')
				.with('terceiros.statuses')
				.where('id', '=', ocorrencia.id)
				.fetch()

			return query
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async addTerceiro(data, trx, auth) {
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			const ocorrencia_id = data.ocorrencia_id

			if (!ocorrencia_id) {
				throw { message: 'ID de ocorrência não foi fornecido.' }
			}

			data.status = 'Aberto'

			const ocorrencia = await Model.findOrFail(ocorrencia_id)

			const terceiroModel = await ocorrencia
				.terceiros()
				.create(data, trx ? trx : null)
			// Status terceiro
			const statusTerceiro = {
				ocorrencia_terceiro_id: terceiroModel.id,
				user_id: auth.user.id,
				motivo: 'Inclusão de Terceiro',
				status: 'Aberto',
			}
			await terceiroModel.statuses().create(statusTerceiro, trx ? trx : null)

			// Adicionar pendencia - Galeria
			const fileConfig = await FileConfig.query()
				.where('modulo', 'like', 'Terceiro')
				.fetch()

			for (const i in fileConfig.rows) {
				const payload = {
					descricao: fileConfig.rows[i].descricao,
					modulo: fileConfig.rows[i].modulo,
					idParent: terceiroModel.id,
					pessoa_id: null,
					status: 'Pendente',
				}
				const model = await Galeria.create(payload, trx)
			}

			await trx.commit()

			return terceiroModel
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async updateTerceiro(ID, data, trx, auth) {
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			const ocorrencia_id = data.ocorrencia_id

			if (!ocorrencia_id) {
				throw { message: 'ID de ocorrência não foi fornecido.' }
			}

			const ocorrencia = await Model.findOrFail(ocorrencia_id)

			const terceiroModel = await Terceiro.findOrFail(ID)
			const dbStatus = terceiroModel.status

			const timestamp = terceiroModel.updated_at
			const update_at_db = moment(timestamp).format()
			const update_at = moment(data.updated_at).format()

			if (update_at_db !== update_at) {
				throw { message: 'Registro alterado por outro usuário.' }
			}

			if (data.status !== dbStatus) {
				const statusTerceiro = {
					ocorrencia_terceiro_id: terceiroModel.id,
					user_id: auth.user.id,
					motivo: 'Mudança de Status',
					status: data.status,
				}
				await terceiroModel
					.statuses()
					.create(statusTerceiro, trx ? trx : null)
			}

			terceiroModel.merge(data)
			// Status terceiro
			//const statusTerceiro= {ocorrencia_terceiro_id: terceiroModel.id, user_id: auth.user.id, motivo: "Alteração de Terceiro", status: data.status}
			//await terceiroModel.statuses().create(statusTerceiro, trx ? trx : null)

			await terceiroModel.save(trx ? trx : null)

			trx.commit()

			return terceiroModel
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async get(ID) {
		try {
			const ocorrencia = await Model.findOrFail(ID)

			await ocorrencia.load('pessoa')
			await ocorrencia.load('equipamento')
			await ocorrencia.load('terceiros')

			return ocorrencia
		} catch (e) {
			throw e
		}
	}

	async index() {
		try {
			const ocorrencia = await Model.query().with('terceiros').fetch()

			return ocorrencia
		} catch (e) {
			throw e
		}
	}

	async addStatus(data, trx, auth) {
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			data.user_id = auth.user.id

			const ocorrencia = await Model.findOrFail(data.ocorrencia_id)
			ocorrencia.status = data.status
			ocorrencia.save(trx ? trx : null)

			const status = data
			await OcorrenciaStatus.create(status, trx ? trx : null)

			await trx.commit()

			return ocorrencia
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async destroyTerceiro(ID, trx, auth) {
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			const terceiro = await Terceiro.findOrFail(ID)

			await terceiro.statuses().where('ocorrencia_terceiro_id', ID).delete()

			await terceiro.delete(trx)

			await trx.commit()

			return terceiro
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async localizar(filtro, trx, auth) {
		try {
			let field_value = filtro.field_value
			let field_name = filtro.field_name

			console.log('filtro ', filtro)
			console.log('field ', field_name)

			let query = Database.select([
				'ocorrencias.id',
				'ocorrencias.pessoa_id',
				'ocorrencias.qualPlaca',
				'ocorrencias.equipamento_id',
				'ocorrencias.dEvento',
				'ocorrencias.status',
				'ocorrencias.tipoAcidente',
				'equipamentos.placa1',
				'equipamentos.marca1',
				'equipamentos.modelo1',
				'equipamentos.placa2',
				'equipamentos.marca2',
				'equipamentos.modelo2',
				'equipamentos.placa3',
				'equipamentos.marca3',
				'equipamentos.modelo3',
				'pessoas.nome as pessoa_nome',
				'pessoas.cpfCnpj',
				'pessoas.tipo as pessoa_tipo',
			])
				.from('ocorrencias')
				.innerJoin(
					'equipamentos',
					'ocorrencias.equipamento_id',
					'equipamentos.id'
				)
				.innerJoin('pessoas', 'ocorrencias.pessoa_id', 'pessoas.id')

			// await Database.select('*').from('ocorrencias').innerJoin('equipamentos','ocorrencias.equipamento_id','equipamentos.id').where('equipamentos.placas','like', '%H%')

			if (field_name === 'placa') {
				query.where('equipamentos.placas', 'like', '%' + field_value + '%')
			}

			if (field_name === 'idOcorrencia') {
				query.where('ocorrencias.id', field_value)
			}

			if (field_name === 'associado') {
				query.where('pessoas.nome', 'like', '%' + field_value + '%')
			}
			let objeto = await query //.first()

			objeto.forEach(e => {
				e.placa = e[`${'placa' + e.qualPlaca}`]
				e.marca = e[`${'marca' + e.qualPlaca}`]
				e.modelo = e[`${'modelo' + e.qualPlaca}`]
				e.anoF = e[`${'anoF' + e.qualPlaca}`]
				e.ModeloF = e[`${'ModeloF' + e.qualPlaca}`]
				e.chassi = e[`${'chassi' + e.qualPlaca}`]
			})
			/*if (objeto) {
            objeto.placa = objeto[`${'placa' + objeto.qualPlaca}`]
            objeto.marca = objeto[`${'marca' + objeto.qualPlaca}`]
            objeto.modelo = objeto[`${'modelo' + objeto.qualPlaca}`]
            objeto.anoF = objeto[`${'anoF' + objeto.qualPlaca}`]
            objeto.ModeloF = objeto[`${'ModeloF' + objeto.qualPlaca}`]
            objeto.chassi = objeto[`${'chassi' + objeto.qualPlaca}`]
         }*/

			return objeto
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

	async localizarPor(filtro, parametros) {
		return new Promise(async (resolve, reject) => {
			try {
				let field_value = filtro.field_value
				let field_name = filtro.field_name
				let field_value_periodo = filtro.field_value_periodo
				let field_value_status = filtro.field_value_status

				let query = Database.select([
					'ocorrencias.id',
					'ocorrencias.pessoa_id',
					'ocorrencias.qualPlaca',
					'ocorrencias.equipamento_id',
					'ocorrencias.dEvento',
					'ocorrencias.status',
					'ocorrencias.tipoAcidente',
					'equipamentos.placa1',
					'equipamentos.marca1',
					'equipamentos.modelo1',
					'equipamentos.placa2',
					'equipamentos.marca2',
					'equipamentos.modelo2',
					'equipamentos.placa3',
					'equipamentos.marca3',
					'equipamentos.modelo3',
					'pessoas.nome as pessoa_nome',
					'pessoas.cpfCnpj',
					'pessoas.tipo as pessoa_tipo',
					'ocorrencia_terceiros.nome as  terceiro',
					'ocorrencia_terceiros.placa as terceiro_placa',
					'ocorrencia_terceiros.patrimonio as terceiro_patrimonio',
				])
					.from('ocorrencias')
					.innerJoin(
						'equipamentos',
						'ocorrencias.equipamento_id',
						'equipamentos.id'
					)
					.innerJoin('pessoas', 'ocorrencias.pessoa_id', 'pessoas.id')
					.leftOuterJoin(
						'ocorrencia_terceiros',
						'ocorrencias.id',
						'ocorrencia_terceiros.ocorrencia_id'
					)

				// await Database.select('*').from('ocorrencias').innerJoin('equipamentos','ocorrencias.equipamento_id','equipamentos.id').where('equipamentos.placas','like', '%H%')

				if (field_name === 'placa') {
					query.where(
						'equipamentos.placas',
						'like',
						'%' + field_value + '%'
					)
				}

				if (field_name === 'id') {
					query.where('ocorrencias.id', field_value)
				}

				if (field_name === 'nome') {
					query.where('pessoas.nome', 'like', '%' + field_value + '%')
				}

				if (field_name === 'terceiro-nome') {
					query.where(
						'ocorrencia_terceiros.nome',
						'like',
						'%' + field_value + '%'
					)
				}

				if (field_name === 'terceiro-placa') {
					query.where(
						'ocorrencia_terceiros.placa',
						'like',
						'%' + field_value + '%'
					)
				}

				if (field_name === 'terceiro-patrimonio') {
					query.where(
						'ocorrencia_terceiros.patrimonio',
						'like',
						'%' + field_value + '%'
					)
				}

				if (field_name === 'status') {
					query.where(
						'ocorrencias.status',
						'like',
						'%' + field_value_status + '%'
					)
				}

				if (field_name == 'periodo-evento') {
					query.whereBetween('ocorrencias.dEvento', [
						field_value_periodo.start.substr(0, 10),
						field_value_periodo.end.substr(0, 10),
					])
				}

				let objeto = await query

				let arr = []
				objeto.forEach(e => {
					e.placa = e[`${'placa' + e.qualPlaca}`]
					e.marca = e[`${'marca' + e.qualPlaca}`]
					e.modelo = e[`${'modelo' + e.qualPlaca}`]
					e.anoF = e[`${'anoF' + e.qualPlaca}`]
					e.ModeloF = e[`${'ModeloF' + e.qualPlaca}`]
					e.chassi = e[`${'chassi' + e.qualPlaca}`]

					if (field_name === 'placa') {
						if (e.placa.includes(field_value)) {
							arr.push(e)
						}
					} else {
						arr.push(e)
					}
				})

				return resolve(objeto)
			} catch (e) {
				reject(e)
			}
		})
	}

	async localizarPorPeriodo(payload, parametros) {
		return new Promise(async (resolve, reject) => {
			try {
				let dStart = null
				let dEnd = null

				if (payload.field_value_periodo) {
					dStart = payload.field_value_periodo.start
					dEnd = payload.field_value_periodo.end
				}

				//const modelConfigOs = await ModelConfig.findBy('modelo', 'Terceiro')

				//let osConfig_id = -1
				//if (modelConfigOs) {
				//	osConfig_id = modelConfigOs.id
				//}

				const query = await Model.query()
					.whereBetween('dEvento', [
						dStart.substr(0, 10),
						dEnd.substr(0, 10),
					])
					.with('pessoa', build => {
						build.select('id', 'nome', 'cpfCnpj', 'parcela')
					})
					.with('equipamento.categoria')
					.with('ordemServicos')
					.with('ordemServicos.config')
					.fetch()

				const json = query.toJSON()

				for (const key in json) {
					if (Object.hasOwnProperty.call(json, key)) {
						const e = json[key]
						let nParticipacao = 0.0
						let nOutros = 0.0
						let placa = ''

						switch (e.qualPlaca) {
							case 1:
								e.equipa_equipamento =
									e.equipamento.marca1 + ' ' + e.equipamento.modelo1

								placa = `${e.equipamento.placa1}`
								placa = placa.substr(0, 3) + '-' + placa.substr(3)
								placa = placa.toUpperCase()
								e.equipa_placa = placa
								e.equipa_anoModelo =
									e.equipamento.anoF1 + '/' + e.equipamento.modeloF1
								break

							case 2:
								e.equipa_equipamento =
									e.equipamento.marca2 + ' ' + e.equipamento.modelo2
								placa = `${e.equipamento.placa2}`
								placa = placa.substr(0, 3) + '-' + placa.substr(3)
								placa = placa.toUpperCase()
								e.equipa_placa = placa
								e.equipa_anoModelo =
									e.equipamento.anoF2 + '/' + e.equipamento.modeloF2
								break

							default:
								e.equipa_equipamento =
									e.equipamento.marca3 + ' ' + e.equipamento.modelo3
								placa = `${e.equipamento.placa3}`
								placa = placa.substr(0, 3) + '-' + placa.substr(3)
								placa = placa.toUpperCase()
								e.equipa_placa = placa
								e.equipa_anoModelo =
									e.equipamento.anoF3 + '/' + e.equipamento.modeloF3
								break
						}

						e.equipa_dAdesao = e.equipamento.dAdesao
							? moment(e.equipamento.dAdesao, 'YYYY-MM-DD').format(
									'DD/MM/YYYY'
							  )
							: ''
						e.equipa_categ = e.equipamento.categoria.abreviado
						e.pessoa_nome = e.pessoa.nome
						e.dEvento = e.dEvento
							? moment(e.dEvento, 'YYYY-MM-DD').format('DD/MM/YYYY')
							: ''
						e.dCad = e.created_at
							? moment(e.created_at, 'YYYY-MM-DD').format('DD/MM/YYYY')
							: ''

						delete e.equipamento

						e.os_participacao = 0.0
						e.os_outros = 0.0
						e.os_total = 0.0

						if (e.ordemServicos.length > 0) {
							for (const keyOS in e.ordemServicos) {
								if (
									Object.hasOwnProperty.call(e.ordemServicos, keyOS)
								) {
									const os = e.ordemServicos[keyOS]

									let tipo = os.config.modelo
									switch (tipo) {
										case 'Participação (Ocorrência)':
											if (os.isRatear && os.status !== 'Cancelado') {
												nParticipacao += os.valorTotal
											}

											break

										default:
											if (os.isRatear && os.status !== 'Cancelado') {
												if (os.isCredito) {
													nOutros = nOutros - os.valorTotal
												} else {
													nOutros = nOutros + os.valorTotal
												}
											}
											break
									}
									e.os_participacao = nParticipacao
									e.os_outros = nOutros
									e.os_total = nOutros - nParticipacao
								}
							}
						} else {
							e.os_participacao = nParticipacao
							e.os_outros = nOutros
							e.os_total = nOutros - nParticipacao
						}

						delete e.ordemServicos
					}
				}

				resolve(json)
			} catch (e) {
				reject(e)
			}
		})
	}

	async localizarTerceiroPorPeriodo(payload, parametros) {
		return new Promise(async (resolve, reject) => {
			try {
				let dStart = null
				let dEnd = null

				if (payload.field_value_periodo) {
					dStart = payload.field_value_periodo.start
					dEnd = payload.field_value_periodo.end
				}

				const query = await Database.select([
					'ocorrencia_terceiros.id',
					'ocorrencia_terceiros.nome',
					'ocorrencia_terceiros.ocorrencia_id',
					'ocorrencia_terceiros.cpfCnpj',
					'ocorrencia_terceiros.status',
					'ocorrencia_terceiros.equipamento',
					'ocorrencia_terceiros.placa',
					'ocorrencia_terceiros.fabricacao',
					'ocorrencia_terceiros.patrimonio',
					'ocorrencia_terceiros.anoF',
					'ocorrencia_terceiros.modeloF',
					'ocorrencia_terceiros.chassi',
					'ocorrencia_terceiros.temSeguro',
					'ocorrencia_terceiros.passivelRessarcimento',
					'ocorrencia_terceiros.atender',
					'ocorrencias.dEvento as osDEvento',
					'ocorrencias.created_at as osDCad',
					'ocorrencias.tipoAcidente as osTipoAcidente',
					'ocorrencias.status as osStatus',
					'ocorrencias.hora as osHora',
					'ocorrencias.local as osLocal',
					'ocorrencias.cidade as osCidade',
					'ocorrencias.uf as osUf',
					'ocorrencias.responsavel as osResponsavel',
					'pessoas.nome as pessoa_nome',
				])
					.from('ocorrencia_terceiros')
					//.distinct('ordem_servicos.id')
					.innerJoin(
						'ocorrencias',
						'ocorrencia_terceiros.ocorrencia_id',
						'ocorrencias.id'
					)
					.innerJoin('pessoas', 'ocorrencias.id', 'pessoas.id')
					.whereBetween('ocorrencias.dEvento', [dStart, dEnd])
				//.where('ocorrencias.tipoAcidente', 'Acidente')
				/*query.leftOuterJoin(
					'ordem_servicos',
					'ocorrencia_terceiros.id',
					'ordem_servicos.ocorrencia_terceiro_id'
				)*/

				const modelConfigOs = await ModelConfig.findBy(
					'modelo',
					'Terceiro (Participação)'
				)
				/*let terceiro_participacao_id= null
				if (modelConfigOs) {
					terceiro_participacao_id = modelConfigOs.id
				}*/

				for (const key in query) {
					if (Object.hasOwnProperty.call(query, key)) {
						const e = query[key]
						if (e.placa) {
							/*if (e.placa.length > 5) {
								let placa = `${e.placa}`
								placa = placa.substr(0, 3) + '-' + placa.substr(3)
								e.placa = placa.toUpperCase()
							}*/
						}
						if (e.osDEvento) {
							e.osDEvento = e.osDEvento
								? moment(e.osDEvento, 'YYYY-MM-DD').format('DD/MM/YYYY')
								: ''
						}
						if (e.osDCad) {
							e.osDCad = e.osDCad
								? moment(e.osDCad, 'YYYY-MM-DD').format('DD/MM/YYYY')
								: ''
						}

						if (e.patrimonio) {
							e.bem = e.patrimonio
						} else {
							e.bem = e.equipamento
						}
						e.os_total = 0.0
						e.os_participacao = 0.0
						e.os_outros = 0.0
						const modelOs = await ModelOS.query()
							.where('ocorrencia_terceiro_id', e.id)
							.with('config')
							.fetch()
						const os = modelOs.toJSON()

						for (const keyOS in os) {
							if (Object.hasOwnProperty.call(os, keyOS)) {
								const eOs = os[keyOS]
								if (eOs.status !== 'Cancelado') {
									if (eOs.isCredito) {
										if (
											eOs.config.modelo === 'Terceiro (Participação)'
										) {
											e.os_participacao += eOs.valorTotal
										} else {
											e.os_outros -= eOs.valorTotal
										}
									} else {
										if (
											eOs.config.modelo === 'Terceiro (Participação)'
										) {
											e.os_participacao -= eOs.valorTotal
										} else {
											e.os_outros += eOs.valorTotal
										}
									}
								}
							}
						}
						e.os_total = e.os_outros - e.os_participacao
					}
				}

				resolve(query)
			} catch (e) {
				reject(e)
			}
		})
	}
	/*
   async addStatusTerceiro(data, trx, auth) {
      try {

         if (!trx) {
            trx = await Database.beginTransaction()
         }

         data.user_id = auth.user.id

         const ocorrenciaTerceiroStatus = await OcorrenciaTerceiroStatus.findOrFail(data.ocorrencia_terceiro_id);
         ocorrenciaTerceiroStatus.status= data.status
         ocorrenciaTerceiroStatus.save(trx ? trx : null)

         const status = data
         await ocorrenciaTerceiroStatus.create(status, trx ? trx : null)

         trx.commit()

         return ocorrenciaTerceiroStatus;
      } catch (e) {
         await trx.rollback()
         throw e;
      }
   }
*/
}

module.exports = Ocorrencia

