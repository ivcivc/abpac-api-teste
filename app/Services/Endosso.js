'use strict'

const lodash = require('lodash')
const moment = require('moment')
const Beneficio = require('../Models/Beneficio')

const Model = use('App/Models/Equipamento')

const Env = use('Env')

const DB_DATABASE = Env.get('DB_DATABASE')

const Database = use('Database')

class Endosso {
	async localizarPor(data, trx, auth) {
		try {
			let equipamento = await Model.findOrFail(1)

			return equipamento_updated_at === updated_at
		} catch (e) {
			if (!e.message) {
				e.message = 'Ocorreu uma falha na transação.'
			}
			throw e
		}
	}

	async substituicao(data, trx, auth) {
		try {
			let equipamento = await Model.findOrFail(1)
			const updated_at = moment(data.updated_at).toJSON()
			const equipamento_updated_at = moment(
				equipamento.updated_at,
				'YYYY-MM-DD hh:mm:ss'
			).toJSON()

			if (equipamento_updated_at !== updated_at) {
				throw {
					message:
						'Não é possível prosseguir. Um outro usuário alterou o registro que está sendo endossado.',
				}
			}

			return equipamento_updated_at === updated_at
		} catch (e) {
			if (!e.message) {
				e.message = 'Ocorreu uma falha na transação.'
			}
			throw e
		}
	}
}

module.exports = Endosso
