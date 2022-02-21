'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class EquipamentoRestricao extends Model {
	equipamento() {
		return this.hasOne('App/Models/Equipamento', 'equipamento_id', 'id')
	}

	restricao() {
		return this.hasOne('App/Models/Restricao', 'restricao_id', 'id')
	}
}

module.exports = EquipamentoRestricao
