'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class EquipamentoProtecao extends Model {
	bloqueador_localizador() {
		return this.hasOne(
			'App/Models/BloqueadorLocalizador',
			'bloqueador_localizador_id',
			'id'
		)
	}

	equipamentoProtecaoStatuses() {
		return this.hasMany('App/Models/EquipamentoProtecaoStatus')
	}

	equipamento() {
		return this.hasOne('App/Models/Equipamento', 'equipamento_id', 'id')
	}

	log() {
		return this.hasMany('App/Models/LogProtecao')
	}
}

module.exports = EquipamentoProtecao
