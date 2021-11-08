'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class OrdemServicoItem extends Model {
	ordemServico() {
		return this.belongsTo('App/Models/ordem_servico/OrdemServico')
	}

	items() {
		return this.hasMany('App/Models/ordem_servico/OrdemServico')
	}

	estoques() {
		return this.hasMany('App/Models/Estoque', 'id', 'entrada_id')
	}
}

module.exports = OrdemServicoItem
