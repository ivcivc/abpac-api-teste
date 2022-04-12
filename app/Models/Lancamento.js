'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Lancamento extends Model {
	items() {
		return this.hasMany('App/Models/LancamentoItem')
	}

	pessoa() {
		return this.hasOne('App/Models/Pessoa', 'pessoa_id', 'id')
	}

	ordemServico() {
		return this.belongsTo('App/Models/ordem_servico/OrdemServico')
	}

	boletos() {
		return this.hasMany('App/Models/Boleto')
	}

	conta() {
		return this.hasOne('App/Models/Conta', 'conta_id', 'id')
	}

	/*ordemServico() {
      return this.belongsTo('App/Models/ordem_servico/OrdemServico')
   }*/

	/*os() {
      return this.hasOne('App/Models/ordem_servico/OrdemServico', 'ordem_servico_id', 'id')
   } */

	endossos() {
		return this.hasMany('App/Models/Equipamento', 'endosso_id', 'endosso_id')
	}

	equipamento() {
		return this.hasOne('App/Models/Equipamento', 'equipamento_id', 'id')
	}

	acordo() {
		return this.hasOne(
			'App/Models/LancamentoGrupo',
			'lancamento_grupo_id',
			'id'
		)
	}
}

module.exports = Lancamento
