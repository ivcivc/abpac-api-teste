'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class EquipamentoEndosso extends Model {
	items() {
		return this.hasMany(
			'App/Models/EquipamentoEndossoItem',
			'id',
			'equipa_endosso_id'
		)
	}

	pessoa() {
		return this.hasOne('App/Models/Pessoa', 'pessoa_id', 'id')
	}
}

module.exports = EquipamentoEndosso
