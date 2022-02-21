'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class EquipamentoControle extends Model {
	protecao() {
		return this.hasOne(
			'App/Models/EquipamentoProtecao',
			'equipamento_protecao_id',
			'id'
		)
	}

	beneficio() {
		return this.hasOne(
			'App/Models/EquipamentoBeneficio',
			'equipamento_beneficio_id',
			'id'
		)
	}

	equipamento() {
		return this.hasOne('App/Models/Equipamento', 'equipamento_id', 'id')
	}

	logs() {
		return this.hasMany('App/Models/EquipamentoControleLog')
	}
}

module.exports = EquipamentoControle
