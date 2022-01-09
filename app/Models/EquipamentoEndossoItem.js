'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class EquipamentoEndossoItem extends Model {
	equipamento() {
		return this.hasOne('App/Models/Equipamento', 'equipamento_id', 'id')
	}
}

module.exports = EquipamentoEndossoItem
