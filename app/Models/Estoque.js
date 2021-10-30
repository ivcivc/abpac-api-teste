'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Estoque extends Model {
	osEntrada() {
		return this.belongsTo(
			'App/Models/ordem_servico/OrdemServicoItem',
			id,
			'entrada_id'
		)
	}

	osSaida() {
		return this.belongsTo(
			'App/Models/ordem_servico/OrdemServicoItem',
			'saida_id',
			id
		)
	}
}

module.exports = Estoque
