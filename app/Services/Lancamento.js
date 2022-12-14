'use strict'

const moment = require('moment')

const Helpers = use('Helpers')
const fs = use('fs')

const Model = use('App/Models/Lancamento')
const ModelItem = use('App/Models/LancamentoItem')
const ModelStatus = use('App/Models/LancamentoStatus')
const ModelBoleto = use('App/Models/Boleto')
const ModelConta = use('App/Models/Conta')
const ModelBoletoConfig = use('App/Models/BoletoConfig')
const ModelPessoa = use('App/Models/Pessoa')
const ModelLancamentoGrupo = use('App/Models/LancamentoGrupo')
const ModelLancamentoGrupoItem = use('App/Models/LancamentoGrupoItem')

const Boleto = use('App/Services/Cnab')

const ServiceConfig = use('App/Services/LancamentoConfig')

const lodash = require('lodash')

const Database = use('Database')

const Redis = use('Redis')
const kue = use('Kue')
const Job = use('App/Jobs/ACBr')

const Factory = use('App/Services/Bank/Factory')

//const Mo = use('App/Models/OcorrenciaTerceiro')

class Lancamento {
	async get(ID) {
		try {
			const model = await Model.findOrFail(ID)
			if (model.pessoa_id) {
				await model.load('pessoa')
			}

			await model.load('items')
			await model.load('boletos')
			await model.load('conta')

			/*if (model.lancamento_grupo_id) {
				await model.load('acordo.items.lancamento')
			}*/

			let json = model.toJSON()

			return json
		} catch (e) {
			throw e
		}
	}

	async getAcordo(ID) {
		try {
			ID = parseInt(ID)

			const grupo = await ModelLancamentoGrupo.findOrFail(ID)
			await grupo.load('items.lancamento.pessoa')

			const arrSai = []

			let json = grupo.toJSON()

			let pessoa = {}

			json.items.forEach(e => {
				arrSai.push(e.lancamento)
				pessoa = {
					id: e.lancamento.pessoa.id,
					nome: e.lancamento.pessoa.nome,
				}
			})

			json.pessoa = pessoa

			const arrEntra = []

			const model = await Model.query()
				.where('lancamento_grupo_id', ID)
				.fetch()

			let jsonLancamento = model.toJSON()

			jsonLancamento.forEach(e => {
				arrEntra.push(e)
			})

			return { entra: arrEntra, sai: arrSai, grupo: json }
		} catch (e) {
			throw e
		}
	}

	async add(data, trx, auth, isJobs = true, isCommit = true) {
		let nrErro = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			delete data['conta']

			data.historico = !lodash.isEmpty(data.historico) ? data.historico : ''
			let items = data.items
			let isFixo = false
			let sair = false
			items.forEach(e => {
				delete e['planoDeConta']
				if (e.id < 0) {
					delete e['id']
				}
				if (e.tag === 'LF') {
					if (lodash.isEmpty(data.historico)) {
						data.historico = e.descricao
					}

					isFixo = true
					sair = true
					return
				}
				if (!sair) {
					data.historico = data.historico = e.descricao
					sair = true
				}
			})
			delete data['items']
			delete data['pessoa']

			let quitacoes = []
			if (lodash.has(data, 'quitacoes')) {
				if (data.quitacoes) {
					data.quitacoes.forEach(e => {
						items.push(e)
					})
				}
			}
			delete data['quitacoes']

			if (!lodash.isEmpty(data.dRecebimento)) {
				if (
					data.valorTotal !==
					data.valorCompensado -
						data.valorCompensadoAcresc +
						data.valorCompensadoDesc
				) {
					nrErro = -100
					throw {
						success: false,
						message:
							'Transa????o abortada. O valor de recebimento n??o confere com o valor da conta.',
					}
				}
			}

			const model = await Model.create(data, trx ? trx : null)
			await model.items().createMany(items, trx ? trx : null)

			/* Status */
			let status = {
				lancamento_id: model.id,
				user_id: auth.user.id,
				motivo: `Aberto`,
				status: data.situacao,
			}
			if (data.situacao === 'Compensado') {
				status.motivo = 'Aberto/Compensado'
			}
			await ModelStatus.create(status, trx ? trx : null)

			if (isCommit) {
				await trx.commit()
			}

			if (model.pessoa_id) {
				await model.load('pessoa')
			}

			return model
		} catch (e) {
			if (isCommit) {
				await trx.rollback()
			}

			if (nrErro) {
				if (nrErro === -100) {
					e.code = 'PERSONALIZADO'
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

	async addMassa(data, trx, auth, isJobs = true) {
		// Gera????o de lan??amentos em massa (rateio - gerarFinanceiro)

		let nrErro = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			data.historico = !lodash.isEmpty(data.historico) ? data.historico : ''
			let items = data.items
			let isFixo = false
			let sair = false
			items.forEach(e => {
				delete e['planoDeConta']
				if (e.id < 0) {
					delete e['id']
				}
				if (e.tag === 'LF') {
					if (lodash.isEmpty(data.historico)) {
						data.historico = e.descricao
					}

					isFixo = true
					sair = true
					return
				}
				if (!sair) {
					data.historico = data.historico = e.descricao
					sair = true
				}
			})
			delete data['items']
			delete data['pessoa']

			let quitacoes = []
			if (lodash.has(data, 'quitacoes')) {
				if (data.quitacoes) {
					data.quitacoes.forEach(e => {
						items.push(e)
					})
				}
			}
			delete data['quitacoes']

			if (!lodash.isEmpty(data.dRecebimento)) {
				if (
					data.valorTotal !==
					data.valorCompensado -
						data.valorCompensadoAcresc +
						data.valorCompensadoDesc
				) {
					nrErro = -100
					throw {
						success: false,
						message:
							'Transa????o abortada. O valor de recebimento n??o confere com o valor da conta.',
					}
				}
			}

			const model = await Model.create(data, trx ? trx : null)
			await model.items().createMany(items, trx ? trx : null)

			/* Status */
			let status = {
				lancamento_id: model.id,
				user_id: auth.user.id,
				motivo: `Aberto`,
				status: data.situacao,
			}
			if (data.situacao === 'Compensado') {
				status.motivo = 'Aberto/Compensado'
			}
			await ModelStatus.create(status, trx ? trx : null)

			if (model.pessoa_id) {
				await model.load('pessoa')
			}

			return model
		} catch (e) {
			await trx.rollback()
			if (nrErro) {
				if (nrErro === -100) {
					e.code = 'PERSONALIZADO'
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

	async update(ID, data, trx = null, auth) {
		let nrErro = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			let model = await Model.findOrFail(ID)
			delete data['pessoa']
			delete data['conta']
			delete data['acordo']

			const update_at_db = moment(model.updated_at).format()
			const update_at = moment(data.updated_at).format()

			if (update_at_db !== update_at) {
				nrErro = -100
				throw {
					success: false,
					message:
						'Transa????o abortada! Este registro foi alterado por outro usu??rio.',
				}
			}

			if (model.status !== data.status || model.situacao !== data.situacao) {
				/* lan??ar novo status */
			}

			let items = data['items']
			items.forEach(e => {
				delete e['id']
				delete e['planoDeConta']
				e.lancamento_id = model.id
			})
			delete data['items']

			let quitacoes = []
			if (lodash.has(data, 'quitacoes')) {
				if (data.quitacoes) {
					data.quitacoes.forEach(e => {
						items.push(e)
					})
				}
			}
			delete data['quitacoes']

			if (data.situacao !== model.situacao) {
				const status = {
					lancamento_id: model.id,
					user_id: auth.user.id,
					motivo: 'Altera????o de status',
					status: data.situacao,
				}
				await ModelStatus.create(status, trx ? trx : null)
			}

			//const itemsDB = await model.items() //.fetch()
			//itemsDB.delete(trx)
			await model
				.items()
				.where('lancamento_id', model.id)
				.delete()
				.transacting(trx ? trx : null)

			model.merge(data)

			await model.items().createMany(items, trx ? trx : null)

			await model.save(trx ? trx : null)

			await trx.commit()

			await model.load('items')
			if (model.pessoa_id) {
				await model.load('pessoa')
			}

			return model
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

	async localizarPor(payload) {
		try {
			let dVencInicio = null
			let dVencFim = null
			let modulo = payload.modulo
			let pessoa_id = payload.field_value_pessoa_id
			let tipo = payload.field_tipo ? payload.field_tipo : 'ambos'
			let localizarPor = payload.field_name // localizarPor
			let status = payload.field_status

			if (payload.field_value_periodo) {
				dVencInicio = payload.field_value_periodo.start
				dVencFim = payload.field_value_periodo.end
			}

			let query = null //.fetch()

			if (modulo === 'AnoMes') {
				let d= moment(payload.anomes,"YYYY/MM").endOf('month')
				
				dVencInicio= payload.anomes + `-01`
				dVencFim= d.format("YYYY-MM-DD")

				query = Model.query().with('pessoa')

				query.where('pessoa_id', payload.field_value_pessoa_id)


				query.where('tipo', "Receita")


				query.whereBetween('dVencimento', [
						dVencInicio,
						dVencFim,
					])
			
				
				if (status) {
					query.whereIn('situacao', ["Compensado", "Aberto"])
				}

				query = await query.fetch()

			}

			if (modulo === 'Aberto') {
				query = Model.query().with('pessoa' , (build) => {
					build.select('id', 'nome')
				})
				query.with('boletos', (build) => {
					build.where('status', 'Aberto')
				})

				if (localizarPor === 'nome') {
					query.where('pessoa_id', pessoa_id)
				}

				if (tipo !== 'ambos') {
					query.where('tipo', tipo)
				}				

				if (status) {
					query.where('situacao', status)
				}

				
				query = await query.fetch()				

			}

			if (modulo === 'todos') {
				query = Model.query().with('pessoa')

				if (localizarPor === 'nome') {
					query.where('pessoa_id', pessoa_id)
				}

				if (localizarPor === 'periodo-vencimento') {
					query.whereBetween('dVencimento', [
						dVencInicio.substr(0, 10),
						dVencFim.substr(0, 10),
					])
				}

				if (localizarPor === 'periodo-competencia') {
					query.whereBetween('dCompetencia', [
						dVencInicio.substr(0, 10),
						dVencFim.substr(0, 10),
					])
				}

				if (localizarPor === 'periodo-liquidacao') {
					query.whereBetween('dRecebimento', [
						dVencInicio.substr(0, 10),
						dVencFim.substr(0, 10),
					])
				}

				if (tipo !== 'ambos') {
					query.where('tipo', tipo)
				}

				if (status) {
					query.where('situacao', status)
				}

				query = await query.fetch()

				/*if (dVencInicio && !pessoa_id) {
               query = await Model.query()
                  .with('pessoa')
                  .whereBetween('dVencimento', [
                     dVencInicio.substr(0, 10),
                     dVencFim.substr(0, 10),
                  ])
                  .whereNot({ situacao: 'Bloqueado' })
                  .fetch()
            }
            if (!dVencInicio && pessoa_id) {
               query = await Model.query()
                  .with('pessoa')

                  .whereNot({ situacao: 'Bloqueado' })
                  .where('pessoa_id', pessoa_id)
                  .fetch()
            }
            if (!dVencInicio && !pessoa_id) {
               query = []
            }*/
			}

			if (modulo === 'atrasado') {
				if (dVencInicio) {
					query = await Model.query()
						.with('pessoa')
						.whereBetween('dVencimento', [
							dVencInicio.substr(0, 10),
							dVencFim.substr(0, 10),
						])
						.where({ situacao: 'aberto' })
						.fetch()
				}
			}

			if (modulo === 'recente') {
				query = await Model.query()
					.with('pessoa')
					.orderBy('updated_at', 'desc')
					//.where({ situacao: 'aberto' })
					.limit(40)
					.fetch()
			}

			if (modulo === 'acordo') {
				const pessoa_id = payload.field_value_pessoa_id
				const tipo = payload.tipo

				query = await Model.query()
					.with('pessoa')
					.where('pessoa_id', pessoa_id)
					.andWhere('tipo', tipo)
					.orderBy('situacao', 'asc')
					.fetch()
			}

			if (modulo === 'os') {
				if (dVencInicio) {
					query = await Model.query()
						.with('pessoa')
						.whereBetween('dVencimento', [
							dVencInicio.substr(0, 10),
							dVencFim.substr(0, 10),
						])
						.where({ situacao: 'Bloqueado' })
						.fetch()
				}
				/*query = await Model.query()
               .with('pessoa')
               .where('situacao', 'Bloqueado')
               .orderBy('situacao', 'asc')
               .fetch()*/
			}

			//await query.paginate(1, 20) //.fetch()

			return query
		} catch (e) {
			throw e
		}
	}

	async cancelar(payload, trx, auth) {
		let nrErro = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}
			let model = await Model.findOrFail(payload.id)

			const update_at_db = moment(model.updated_at).format()
			const update_at = moment(payload.updated_at).format()

			if (update_at_db !== update_at) {
				nrErro = -100
				throw {
					success: false,
					message:
						'Cancelamento n??o autorizado. Este registro foi alterado por outro usu??rio.',
				}
			}

			if (
				model.inadimplente === 'Debito' ||
				model.inadimplente === 'Credito'
			) {
				nrErro = -100
				throw {
					success: false,
					message:
						'Cancelamento n??o autorizado. Esta conta foi rateada com inadimplente.',
				}
			}

			if (model.situacao === 'Compensado') {
				nrErro = -100
				throw {
					success: false,
					message:
						'Cancelamento n??o autorizado. Esta conta foi liquidada.',
				}
			}

			const status = {
				lancamento_id: model.id,
				user_id: auth.user.id,
				motivo: `De: ${model.status}/${model.situacao} - Para: ${model.status}/Cancelado`,
				status: 'Cancelado',
			}
			await ModelStatus.create(status, trx ? trx : null)

			if (model.situacao !== 'Aberto' && model.tipo === 'Despesa') {
				nrErro = -100
				throw { success: false, message: 'Cancelamento n??o autorizado.' }
			}

			if (model.situacao !== 'Aberto' && model.tipo === 'Receita') {
				nrErro = -100
				throw { success: false, message: 'Cancelamento n??o autorizado.' }
			}
			model.situacao = 'Cancelado'

			await model.save(trx ? trx : null)

			await trx.commit()

			await model.load('items')
			if (model.pessoa_id) {
				await model.load('pessoa')
			}

			return model
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

	async cancelar_compensacao(payload, trx, auth) {
		let nrErro = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}
			let model = await Model.findOrFail(payload.id)

			const update_at_db = moment(model.updated_at).format()
			const update_at = moment(payload.updated_at).format()

			if (update_at_db !== update_at) {
				nrErro = -100
				throw {
					success: false,
					message:
						'Cancelamento n??o autorizado. Este registro foi alterado por outro usu??rio.',
				}
			}

			if (model.situacao !== 'Compensado') {
				nrErro = -100
				throw {
					success: false,
					message:
						'Cancelamento n??o autorizado. Esta conta ainda n??o foi liquidada.',
				}
			}

			const status = {
				lancamento_id: model.id,
				user_id: auth.user.id,
				motivo: `De: ${model.status}/${model.situacao} - Para: ${model.status}/Aberto`,
				status: 'Aberto',
			}
			await ModelStatus.create(status, trx ? trx : null)

			model.merge({
				situacao: 'Aberto',
				valorCompensado: 0.0,
				valorCompensadoAcresc: 0.0,
				valorCompensadoDesc: 0.0,
				valorCompensadoPrej: 0.0,
				dRecebimento: null,
			})

			await ModelItem.query()
				.where('lancamento_id', model.id)
				.whereIn('tag', ['QA', 'QD', 'QP'])
				.transacting(trx ? trx : null)
				.delete()

			await model.save(trx ? trx : null)

			await trx.commit()

			await model.load('items')
			if (model.pessoa_id) {
				await model.load('pessoa')
			}

			return model
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

	async reverter_cancelamento(payload, trx, auth) {
		let nrErro = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			let model = await Model.findOrFail(payload.id)

			const update_at_db = moment(model.updated_at).format()
			const update_at = moment(payload.updated_at).format()

			if (update_at_db !== update_at) {
				nrErro = -100
				throw {
					success: false,
					message:
						'Revers??o n??o autorizada. Este registro foi alterado por outro usu??rio.',
				}
			}

			const status = {
				lancamento_id: model.id,
				user_id: auth.user.id,
				motivo: `De: ${model.status}/${model.situacao} - Para: ${model.status}/Aberto`,
				status: 'Aberto',
			}
			await ModelStatus.create(status, trx ? trx : null)

			if (model.parent_id > 0) {
				nrErro = -100
				throw {
					success: false,
					message: 'N??o ?? poss??vel reverter essa conta',
				}
			}

			if (model.situacao !== 'Cancelado' && model.tipo === 'Despesa') {
				nrErro = -100
				throw { success: false, message: 'Revers??o n??o autorizada.' }
			}

			if (model.situacao !== 'Cancelado' && model.tipo === 'Receita') {
				nrErro = -100
				throw { success: false, message: 'Cancelamento n??o autorizado.' }
			}
			model.situacao = 'Aberto'

			await model.save(trx ? trx : null)

			await trx.commit()

			await model.load('items')
			if (model.pessoa_id) {
				await model.load('pessoa')
			}

			return model
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

	async inadimplente(payload, trx, auth) {
		let nrErro = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			let model = await Model.findOrFail(payload.id)

			const update_at_db = moment(model.updated_at).format()
			const update_at = moment(payload.updated_at).format()

			if (update_at_db !== update_at) {
				nrErro = -100
				throw {
					success: false,
					message:
						'Gera????o de inadimplentes rejeitada. Este registro foi alterado por outro usu??rio.',
				}
			}

			if (model.status !== 'Aberto') {
				nrErro = -100
				throw {
					success: false,
					message: 'N??o ?? poss??vel transformar em conta inadimplente',
				}
			}

			// Permitido para constas vencidas a partir 16-05/2021 (Cris)
			/*if (moment(model.dVencimento).isAfter(moment())) {
            // moment(model.dVencimento) < moment()
            nrErro = -100
            throw {
               success: false,
               message: 'Opera????o permitida apenas para contas vencidas',
            }
         }*/

			const novoStatus = 'Inadimplente'
			const status = {
				lancamento_id: model.id,
				user_id: auth.user.id,
				//motivo: `Inadimplente`,
				motivo: `De: ${model.status}/${model.situacao} - Para: ${model.situacao}/Inadimplente`,
				status: novoStatus,
			}
			await ModelStatus.create(status, trx ? trx : null)

			model.merge({ inadimplente: 'Sim', status: 'Inadimplente' })

			await model.save(trx ? trx : null)

			await trx.commit()
			//await trx.rollback()

			await model.load('items')

			if (model.pessoa_id) {
				await model.load('pessoa')
			}

			return { success: true, atual: model, novo: model }
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

	async reverter_inadimplente(payload, trx, auth) {
		let nrErro = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			let model = await Model.findOrFail(payload.id)

			const update_at_db = moment(model.updated_at).format()
			const update_at = moment(payload.updated_at).format()

			if (update_at_db !== update_at) {
				nrErro = -100
				throw {
					success: false,
					message:
						'Revers??o de inadimplentes rejeitada. Este registro foi alterado por outro usu??rio.',
				}
			}

			if (model.status !== 'Inadimplente') {
				nrErro = -100
				throw {
					success: false,
					message: 'N??o ?? poss??vel reverter essa conta',
				}
			}

			if (model.inadimplente !== 'Sim') {
				nrErro = -100
				throw {
					success: false,
					message:
						'Revers??o de inadimplentes rejeitada. Este registro foi rateado.',
				}
			}

			const status = {
				lancamento_id: model.id,
				user_id: auth.user.id,
				motivo: `Revers??o Inadimplente`,
				status: model.situacao,
			}
			await ModelStatus.create(status, trx ? trx : null)

			let cStatus = model.status
			if (model.status === 'Inadimplente') {
				cStatus = 'Aberto'
			}

			model.merge({ inadimplente: 'N??o', status: cStatus })

			await model.save(trx ? trx : null)

			await trx.commit()

			await model.load('items')

			if (model.pessoa_id) {
				await model.load('pessoa')
			}

			return { success: true, atual: model, revertido: model }
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

	async acordo(payload, trx, auth) {
		let nrErro = null

		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			let operacao = 'acordo' //payload.operacao
			let conta_id = payload.conta_id
			let forma = payload.forma
			let tipo = payload.tipo
			let obs = null
			let parcelas = payload.quantasParcelas

			let grupo_id = payload.grupo_id
			if (!operacao) {
				nrErro = -100
				throw {
					success: false,
					message: 'Grupo n??o informado.',
				}
			}

			if (!operacao) {
				nrErro = -100
				throw {
					success: false,
					message: 'N??o foi informado o tipo de opera????o.',
				}
			}

			let arrAddLancamentos = payload.addLancamentos
			if (arrAddLancamentos.length <= 0) {
				nrErro = -100
				throw {
					success: false,
					message: 'Lista de novas contas n??o recebida.',
				}
			}

			let arrLista = []
			let arrListaID = []
			for (let i in payload.lista) {
				let e = payload.lista[i]
				arrLista.push({ id: e.id, updated_at: e.updated_at })
				arrListaID.push(e.id)
			}

			if (arrLista.length <= 0) {
				nrErro = -100
				throw {
					success: false,
					message: 'Selecione as contas para efetiva????o do acordo.',
				}
			}

			const modelLista = await Model.query()
				//.transacting(trx ? trx : null)
				//.update({ equipamento_id: equipamentoAdd.id })
				.whereIn('id', arrListaID)
				.fetch()

			if (modelLista.rows.length !== arrLista.length) {
				nrErro = -100
				throw {
					success: false,
					message:
						'A conta selecionada para acordo n??o correspondem ao cadastro atual.',
				}
			}

			let nValorTotalLancamento = 0
			let nValorSaldoTotalInad = 0

			for (let i in modelLista.rows) {
				let e = modelLista.rows[i]

				let o = lodash.find(arrLista, { id: e.id })
				if (!o) {
					nrErro = -100
					throw {
						success: false,
						message: 'Conta n??o localizada no servidor.',
					}
				}
				const update_at_db = moment(e.updated_at).format()
				const update_at = moment(o.updated_at).format()

				if (update_at_db !== update_at) {
					nrErro = -100
					throw {
						success: false,
						message:
							'Transa????o abortada. Uma conta selecionada foi alterada por outro usu??rio.',
					}
				}

				nValorSaldoTotalInad += e.saldoInad
				nValorTotalLancamento += e.valorTotal
			}

			// Incluir lanamentoGrupo
			const modelLancamentoGrupo = await ModelLancamentoGrupo.create(
				{
					tipo: 'Acordo',
					valorTotal: nValorTotalLancamento,
					saldoTotalInad: payload.saldoTotalInad,
					status: 'Ativo',
					obs: payload.nota,
					parcelas: parcelas,
				},
				trx ? trx : null
			)

			//arrAddLancamentos.forEach( e => {
			for (let i in arrAddLancamentos) {
				let o = {
					forma: arrAddLancamentos[i].forma,
					subGrupo_id: grupo_id,
					conta_id: conta_id,
					dCompetencia: arrAddLancamentos[i].dCompetencia,
					dVencimento: arrAddLancamentos[i].dVencimento,
					historico:
						operacao === 'acordo' ? 'Acordo' : 'Acordo inadimplente',
					inadimplente: arrAddLancamentos[i].inadimplente,
					isConciliado: 0,
					nota: arrAddLancamentos[i].nota,
					parcelaF: arrAddLancamentos[i].parcelaF,
					parcelaI: arrAddLancamentos[i].parcelaI,
					pessoa_id: arrAddLancamentos[i].pessoa_id,
					tipo: tipo,
					valorBase: arrAddLancamentos[i].valorBase,
					valorAcresc: arrAddLancamentos[i].valorAcrescimo,
					valorDesc:
						arrAddLancamentos[i].valorDesconto > 0
							? arrAddLancamentos[i].valorDesconto
							: arrAddLancamentos[i].valorPrejuizo,
					//valorPrejuizo: arrAddLancamentos[i].valorPrejuizo,
					valorTotal: arrAddLancamentos[i].valorTotal,
					status: operacao === 'acordo' ? 'Acordado' : 'Acordado',
					situacao: operacao === 'acordo' ? 'Aberto' : 'Aberto',
					saldoInad: arrAddLancamentos[i].saldoInad,
					lancamento_grupo_id: modelLancamentoGrupo.id,
				}

				let model = await Model.create(o, trx ? trx : null)
				const addLanc = await model
					.items()
					.createMany(arrAddLancamentos[i].items, trx ? trx : null)

				/* Status */
				let status = {
					lancamento_id: model.id,
					user_id: auth.user.id,
					motivo:
						operacao === 'acordo' ? 'Acordado' : 'Acordo inadimplente',
					status: operacao === 'acordo' ? 'Acordado' : 'Aberto',
				}
				await ModelStatus.create(status, trx ? trx : null)
			}

			//payload.lista.forEach(e => {
			for (let i in arrLista) {
				// Model lancamento grupo item
				await ModelLancamentoGrupoItem.create(
					{
						lancamento_grupo_id: modelLancamentoGrupo.id,
						lancamento_id: arrLista[i].id,
						valor: arrLista[i].valorTotal,
						saldoInad: arrLista[i].saldoInad,
					},
					trx ? trx : null
				)

				let modelUpdate = await Model.findOrFail(
					arrLista[i].id,
					trx ? trx : null
				)
				if (operacao === 'acordo-inadimplente') {
					modelUpdate.situacao = 'Acordado'
				}
				if (operacao === 'acordo') {
					modelUpdate.situacao = 'Acordado'
					modelUpdate.valorCompensado = modelUpdate.valorTotal
				}

				modelUpdate.grupo_id = grupo_id

				let status = {
					lancamento_id: modelUpdate.id,
					user_id: auth.user.id,
					motivo: operacao === 'acordo' ? 'Acordo' : 'Acordo inadimplente',
					status: operacao === 'acordo' ? 'Acordado' : 'Acordado',
				}
				await ModelStatus.create(status, trx ? trx : null)

				await modelUpdate.save(trx ? trx : null)
			}

			await trx.commit()
			//await trx.rollback()

			return { modelLista }
			//await trx.commit()
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

	async gerarLancamentos(payload, trx, auth, onTrx = true) {
		let nrErro = null

		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}
			const grupo_id = payload.grupo_id
			const historico = payload.historico
			const tipo = payload.tipo
			const status = 'Aberto'
			let situacao = 'Aberto'
			const ordem_servico_status = payload.ordem_servico_status
			const ordem_servico_id = payload.ordem_servico_id
			const equipamento_id = payload.equipamento_id

			const listaID = []

			if (ordem_servico_id && ordem_servico_status === 'Finalizado') {
				situacao = 'Aberto'
			}

			const arrAddLancamentos = payload.addLancamentos

			for (let i in arrAddLancamentos) {
				let o = {
					forma: arrAddLancamentos[i].forma,
					subGrupo_id: grupo_id,
					conta_id: arrAddLancamentos[i].conta_id,
					dCompetencia: arrAddLancamentos[i].dCompetencia,
					dVencimento: arrAddLancamentos[i].dVencimento,
					historico: arrAddLancamentos[i].historico,
					isConciliado: 0,
					nota: arrAddLancamentos[i].nota,
					ordem_servico_id: ordem_servico_id,
					equipamento_id: equipamento_id,
					parcelaF: arrAddLancamentos[i].parcelaF,
					parcelaI: arrAddLancamentos[i].parcelaI,
					pessoa_id: arrAddLancamentos[i].pessoa_id,
					tipo: tipo,
					valorBase: arrAddLancamentos[i].valorBase,
					valorAcresc: arrAddLancamentos[i].valorAcrescimo,
					valorDesc:
						arrAddLancamentos[i].valorDesconto > 0
							? arrAddLancamentos[i].valorDesconto
							: arrAddLancamentos[i].valorPrejuizo,
					//valorPrejuizo: arrAddLancamentos[i].valorPrejuizo,
					valorTotal: arrAddLancamentos[i].valorTotal,
					status: status,
					situacao: situacao,
				}

				let model = await Model.create(o, trx ? trx : null)
				await model
					.items()
					.createMany(arrAddLancamentos[i].items, trx ? trx : null)

				listaID.push(model.id)

				/* Status */
				let oStatus = {
					lancamento_id: model.id,
					user_id: auth.user.id,
					motivo:
						parseInt(ordem_servico_id) > 0
							? `Criado O.S. ${ordem_servico_id}`
							: 'Conta gerada pelo sistema',
					status: 'Aberto',
				}
				await ModelStatus.create(oStatus, trx ? trx : null)

				if (
					ordem_servico_status === 'Finalizado' &&
					parseInt(ordem_servico_id) > 0
				) {
					oStatus = {
						lancamento_id: model.id,
						user_id: auth.user.id,
						motivo: `O.S. ${ordem_servico_id} finalizada`,
						status,
					}
					await ModelStatus.create(oStatus, trx ? trx : null)
				}
			}

			if (onTrx) {
				await trx.commit()
			}

			let query = {}

			if (onTrx) {
				query = await Model.query().whereIn('id', listaID).fetch()
			}

			return query
		} catch (e) {
			if (onTrx) {
				await trx.rollback()
			}

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

	async addStatus(data, trx, auth) {
		let nrErro = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			data.user_id = auth.user.id

			const model = await Model.findOrFail(data.lancamento_id)
			model.status = data.status
			model.save(trx ? trx : null)

			const status = data
			await ModelStatus.create(status, trx ? trx : null)

			await trx.commit()

			return model
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

	async destroyOS(ordem_servico_id, trx, auth) {
		let nrErro = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			const query = await Model.query()
				.where('ordem_servico_id', ordem_servico_id)
				.with('boletos')
				.fetch()

			let isError = false
			let isBoleto = false

			const queryJSON = query.toJSON()

			for (let i in queryJSON) {
				let e = queryJSON[i]
				if (e.boletos.length > 0) {
					isBoleto = true
					for (let ii in e.boletos) {
						let b = e.boletos[ii]
						if (b.status === 'Aberto' || b.status === 'Compensado') {
							nrErro = -100
							const msg =
								b.status === 'Aberto' ? 'em aberto' : 'compensado'
							throw {
								success: false,
								message: `Exclus??o n??o autorizada. Motivo: Boleto ${msg}`,
							}
						}
					}
				}
				if (e.situacao === 'Compensado') {
					isError = true
					throw {
						success: false,
						message: `Exclus??o n??o autorizada. Motivo: Conta compensada.`,
					}
				}
			}

			if (isError) {
				nrErro = -100
				throw {
					success: false,
					message: 'Exclus??o n??o autorizada para contas com movimenta????o.',
				}
			}

			let msg = 'Exclu??do com sucesso'

			if (isBoleto) {
				msg = 'Cancelado com sucesso'
				const updated_at = moment().format('YYYY-MM-DD h:mm:s')
				await Model.query()
					.where('ordem_servico_id', ordem_servico_id)
					.transacting(trx ? trx : null)
					.update({ situacao: 'Cancelado', updated_at })
			} else {
				await Model.query()
					.where('ordem_servico_id', ordem_servico_id)
					.transacting(trx ? trx : null)
					.delete()
			}

			await trx.commit()

			return { success: true, message: msg }
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

	async openBank_novoBoleto(data, auth) {
		let nrErro = null
		let trx = null

		try {
			trx = await Database.beginTransaction()

			let model = await Model.findOrFail(data.id)
			await model.load('boletos')
			await model.load('pessoa')
			//await model.load('items')
			await model.load('conta')

			const update_at_db = moment(model.updated_at).format()
			const update_at = moment(data.updated_at).format()

			if (update_at_db !== update_at) {
				nrErro = -100
				throw {
					success: false,
					message:
						'Transa????o abortada! Este registro foi alterado por outro usu??rio.',
				}
			}

			const modelJson = model.toJSON()

			if (lodash.has(modelJson, 'boletos')) {
				modelJson.boletos.forEach(b => {
					if (b.status === 'Aberto') {
						nrErro = -200
						throw {
							success: false,
							nrErro: -200,
							message:
								'N??o ?? possivel adicionar boleto. J?? existe um boleto ativo.',
							data: b,
						}
					}
				})
			}

			modelJson.boleto_nota1 = data.boleto_nota1
			modelJson.boleto_nota2 = data.boleto_nota2
			modelJson.boleto_nota3 = data.boleto_nota3

			let boleto = await Factory().Boleto('sicoob')

			let res = await boleto.novoBoleto(modelJson, {
				conta_id: data.conta_id,
			})

			if (!res) {
				nrErro = -350
				throw {
					success: false,
					message: 'Ocorreu uma falha n??o esperada no m??dulo open bank.',
				}
			}

			if (!lodash.has(res, 'resultado')) {
				nrErro = -351
				throw {
					success: false,
					message: 'O Open bank n??o respondeu um resultado esperado.',
				}
			}
			const oResult = res.resultado[0]

			console.log('Novo boleto - sicoob resposta ', oResult)

			if (oResult.status) {
				if (oResult.status.codigo !== 200) {
					nrErro = -352
					throw {
						success: false,
						message: oResult.status.mensagem,
					}
				}
			}

			const oBoleto = oResult.boleto

			const modelBoleto = await ModelBoleto.create(
				{
					pessoa_id: data.pessoa_id,
					conta_id: data.conta_id,
					lancamento_id: data.id,
					valorTotal: oBoleto.valor,
					dVencimento: oBoleto.dataVencimento,
					nossoNumero: oBoleto.nossoNumero,
					boleto_nota1: data.boleto_nota1,
					boleto_nota2: data.boleto_nota2,
					boleto_nota3: data.boleto_nota3,
					isOpenBank: true,
					linhaDigitavel: oBoleto.linhaDigitavel,
					status: 'Aberto',
				},
				trx ? trx : null
			)

			//await trx.rollback()
			await trx.commit()

			const pastaPDF = Helpers.tmpPath('ACBr/pdf/')
			const arquivo = `boleto_${model.id}.pdf`

			fs.writeFile(
				pastaPDF + arquivo,
				oBoleto.pdfBoleto,
				'base64',
				async (err, data) => {
					if (err) {
						console.log('falha na grava????o do boleto ' + arquivo)
					}
					console.log('boleto gravado com sucesso!')
				}
			)

			return { success: true, message: 'Boleto emitido', data: modelBoleto }
		} catch (e) {
			await trx.rollback()

			if (nrErro) {
				if (
					nrErro === -100 ||
					nrErro === -200 ||
					nrErro === -350 ||
					nrErro === -351 ||
					nrErro === -352
				) {
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

	async gerarBoleto(data, auth) {
		let nrErro = null
		try {
			const trx = await Database.beginTransaction()

			delete data['nome']
			delete data['boletos']
			delete data['status_situacao']
			delete data['parcelas']

			let model = await Model.findOrFail(data.id)
			delete data['pessoa']

			const update_at_db = moment(model.updated_at).format()
			const update_at = moment(data.updated_at).format()

			if (update_at_db !== update_at) {
				nrErro = -100
				throw {
					success: false,
					message:
						'Transa????o abortada! Este registro foi alterado por outro usu??rio.',
				}
			}

			if (model.status !== data.status || model.situacao !== data.situacao) {
				/* lan??ar novo status */
			}

			let items = data['items']
			items.forEach(e => {
				delete e['id']
				delete e['planoDeConta']
				e.lancamento_id = model.id
			})
			delete data['items']

			let quitacoes = []
			if (lodash.has(data, 'quitacoes')) {
				if (data.quitacoes) {
					data.quitacoes.forEach(e => {
						items.push(e)
					})
				}
			}
			delete data['quitacoes']

			if (data.situacao !== model.situacao) {
				const status = {
					lancamento_id: model.id,
					user_id: auth.user.id,
					motivo: 'Altera????o de status',
					status: data.situacao,
				}
				await ModelStatus.create(status, trx ? trx : null)
			}

			//const itemsDB = await model.items() //.fetch()
			//itemsDB.delete(trx)
			await model
				.items()
				.where('lancamento_id', model.id)
				.transacting(trx ? trx : null)
				.delete()

			model.merge(data)

			await model.items().createMany(items, trx ? trx : null)

			// Contas (plano de contas)
			const conta = await ModelConta.find(model.conta_id)
			if (!conta) {
			}
			let boletoConfig = await ModelBoletoConfig.findByOrFail(
				'modelo',
				conta.modeloBoleto
			)

			// Boleto
			let nossoNumero = boletoConfig.nossoNumero
			boletoConfig.nossoNumero = nossoNumero + 1
			nossoNumero = boletoConfig.nossoNumero

			console.log(nossoNumero)

			await boletoConfig.save()

			const objBoleto = {
				conta_id: model.conta_id,
				boleto_nota1: '',
				boleto_nota2: '',
				dVencimento: moment(model.dVencimento, 'YYYY-MM-DD').format(
					'YYYY-MM-DD'
				),
				dCompensacao: null,

				nossoNumero: nossoNumero,
				lancamento_id: model.id,
				pessoa_id: model.pessoa_id,

				valorTotal: model.valorTotal,
				status: 'Aberto',
			}

			const modelBoleto = ModelBoleto.create(objBoleto, trx ? trx : null)

			await model.save(trx ? trx : null)

			await model.load('pessoa')
			let jsonLancamento = model.toJSON()

			const dVenc = model.dVencimento
			objBoleto.pessoa = jsonLancamento.pessoa
			objBoleto.dVencimento = moment(dVenc, 'YYYY-MM-DD').format(
				'DD/MM/YYYY'
			)
			objBoleto.dVencimento2 = moment(dVenc, 'YYYY-MM-DD').format(
				'YYYY-MM-DD'
			)

			if (lodash.isEmpty(jsonLancamento.pessoa.endCep)) {
				jsonLancamento.pessoa.endCep = '32676205'
			}
			if (lodash.isEmpty(jsonLancamento.pessoa.endEstado)) {
				jsonLancamento.pessoa.endEstado = 'MG'
			}
			if (lodash.isEmpty(jsonLancamento.pessoa.endCidade)) {
				jsonLancamento.pessoa.endCidade = 'BETIM'
			}
			if (lodash.isEmpty(jsonLancamento.pessoa.endBairro)) {
				jsonLancamento.pessoa.endBairro = 'NAO INFORMADO'
			}
			if (lodash.isEmpty(jsonLancamento.pessoa.endRua)) {
				jsonLancamento.pessoa.endRua = 'NAO INFORMADO'
			}

			objBoleto.valorTotal = objBoleto.valorTotal //.toString().replace('.', ',')
			objBoleto.banco = conta.banco
			objBoleto.agencia = conta.agencia
			objBoleto.agenciaDV = conta.agenciaDV
			objBoleto.contaCorrente = conta.contaCorrente
			objBoleto.contaCorrenteDV = conta.contaCorrenteDV
			objBoleto.convenio = conta.convenio
			objBoleto.pessoa_nome = jsonLancamento.pessoa.nome
			objBoleto.cpfCnpj = jsonLancamento.pessoa.cpfCnpj
			objBoleto.endRua = jsonLancamento.pessoa.endRua
			objBoleto.Numero = '.'
			objBoleto.endBairro = jsonLancamento.pessoa.endBairro
			objBoleto.endComplemento = jsonLancamento.pessoa.endComplemento
			objBoleto.endCidade = jsonLancamento.pessoa.endCidade
			objBoleto.endEstado = jsonLancamento.pessoa.endEstado
			objBoleto.endCep = jsonLancamento.pessoa.endCep

			const boleto = await new Boleto().gerarBoleto([objBoleto])

			if (!boleto.success) {
				throw boleto
			}

			//await trx.rollback()
			await trx.commit()

			await model.load('items')
			await model.load('boletos')

			let json = model.toJSON()

			return json
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

	async gerarSegundaViaBoleto(data, auth) {
		let nrErro = null
		try {
			//const trx = await Database.beginTransaction()

			let nossoNumero = data.nossoNumero

			const modelConta = await ModelConta.findOrFail(data.conta_id)

			//const modelBoleto= await ModelBoleto.findOrFail(data.boleto_id)
			//const modelLancamento= await Model.findByOrFail(data.lancamento_id)

			const factory = use('App/Services/Bank/Factory')
			let boleto = await factory().Boleto('sicoob')
			let config = {
				parametros: {
					numeroContrato: modelConta.convenio,
					modalidade: 1,
					nossoNumero,
					gerarPdf: true,
				},
				conta_id: data.conta_id,
			}
			let res = await boleto.segundaVia(config)

			console.log('res= ', res)

			if (lodash.has(res, 'resultado')) {
				if (!lodash.has(res.resultado, 'nossoNumero')) {
					nrErro = -351
					throw {
						success: false,
						message: 'O Open bank n??o retornou o arquivo PDF.',
					}
				}

				if (parseInt(res.resultado.nossoNumero) === 0) {
					nrErro = -351
					throw {
						success: false,
						message: 'O Open bank n??o retornou o arquivo PDF.',
					}
				}

				const pastaPDF = Helpers.tmpPath('ACBr/pdf/')
				const arquivo = `boleto_${data.lancamento_id}.pdf`

				console.log('arquivo ', pastaPDF + arquivo)

				fs.writeFile(
					pastaPDF + arquivo,
					res.resultado.pdfBoleto,
					'base64',
					async (err, data) => {
						if (err) {
							console.log('falha na grava????o do boleto ' + arquivo)
							nrErro = -351
							throw {
								success: false,
								message:
									'falha na grava????o do arquivo de boleto (PDF).',
							}
						}
						console.log('boleto gravado com sucesso!')
					}
				)
			}

			//await trx.rollback()

			return res
		} catch (e) {
			//await trx.rollback()

			if (nrErro) {
				if (nrErro === -351) {
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

	async getConfig() {}

	// Excluir assim que terminar de atualizar o banco de dados da ABPAC %%%%%%%%%%%%%%%%
	async _gerarGrupoAcordo_TMP() {
		const trx = await Database.beginTransaction()
		try {
			const queryLancamentos = await Model.query()
				.select(
					'id',
					'grupo_id',
					'subGrupo_id',
					'lancamento_grupo_id',
					'valorTotal'
				)
				.transacting(trx ? trx : null)
				//.update({ equipamento_id: equipamentoAdd.id })
				.whereNotNull('grupo_id')
				.whereNull('lancamento_grupo_id')
				.fetch()

			for (let i in queryLancamentos.rows) {
				let e = queryLancamentos.rows[i]

				const querySubGrupo = await Model.query()
					.select(
						'id',
						'grupo_id',
						'subGrupo_id',
						'lancamento_grupo_id',
						'valorTotal'
					)
					.where('subGrupo_id', e.grupo_id)
					.transacting(trx ? trx : null)
					.fetch()

				let modelLancamentoGrupo = null

				if (querySubGrupo.rows.length > 0) {
					// Incluir lanamentoGrupo
					modelLancamentoGrupo = await ModelLancamentoGrupo.create(
						{
							tipo: 'Acordo',
							valorTotal: 0,
							saldoTotalInad: 0,
							status: 'Ativo',
							obs: 'Convers??o autom??tica',
							//parcelas: e.length,
						},
						trx ? trx : null
					)
				}

				let nValorTotal = 0.0

				for (let ii in querySubGrupo.rows) {
					const subgrupo = querySubGrupo.rows[ii]

					nValorTotal = nValorTotal + subgrupo.valorTotal

					subgrupo.lancamento_grupo_id = modelLancamentoGrupo.id
					await subgrupo.save(trx)
				}

				const queryGrupo = await Model.query()
					.select(
						'id',
						'grupo_id',
						'subGrupo_id',
						'lancamento_grupo_id',
						'valorTotal'
					)
					.where('grupo_id', e.grupo_id)
					.transacting(trx ? trx : null)
					.fetch()

				for (let ig in queryGrupo.rows) {
					const grupo = queryGrupo.rows[ig]
					await ModelLancamentoGrupoItem.create(
						{
							lancamento_grupo_id: modelLancamentoGrupo.id,
							lancamento_id: grupo.id,
							valor: grupo.valorTotal,
							saldoInad: 0.0,
						},
						trx ? trx : null
					)
					if (grupo.situacao === 'Compensado') {
						grupo.situacao = 'Acordado'
						await grupo.save(trx)
					}
				}

				if (querySubGrupo.rows.length > 0) {
					modelLancamentoGrupo.valorTotal = nValorTotal
					modelLancamentoGrupo.parcelas = querySubGrupo.rows.length
					//e.lancamento_grupo_id = modelLancamentoGrupo.id
					await modelLancamentoGrupo.save(trx)
					await e.save(trx) /// lancamentos
				}
			}

			await trx.commit()

			return queryLancamentos.toJSON()
		} catch (error) {
			await trx.rollback()
		}
	}
}

module.exports = Lancamento
