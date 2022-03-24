'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RateioEquipamento extends Model {
	rateio() {
		return this.hasOne('App/Models/Rateio', 'rateio_id', 'id')
	}

	categoria() {
		return this.hasOne('App/Models/Categoria', 'categoria_id', 'id')
	}

	equipamento() {
		return this.hasOne('App/Models/Equipamento', 'equipamento_id', 'id')
	}

	beneficios() {
		return this.hasMany('App/Models/RateioEquipamentoBeneficio')
	}
}

module.exports = RateioEquipamento
