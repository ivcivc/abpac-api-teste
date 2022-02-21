'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class EquipamentoControleLog extends Model {
	user() {
		return this.hasOne('App/Models/User', 'user_id', 'id')
	}
}

module.exports = EquipamentoControleLog
