'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Equipamento extends Model {
	equipamentoStatuses() {
		return this.hasMany('App/Models/EquipamentoStatus')
	}

	osAdesao() {
		return this.hasOne(
			'App/Models/ordem_servico/OrdemServico',
			'preCadastro_id',
			'preCadastro_id'
		)
	}

	preCadastro() {
		return this.hasMany('App/Models/PreCadastro', 'preCdastro_id', 'id')
	}

	ocorrencias() {
		return this.hasMany('App/Models/Ocorrencia')
	}

	pessoa() {
		return this.hasOne('App/Models/Pessoa', 'pessoa_id', 'id')
	}

	categoria() {
		return this.hasOne('App/Models/Categoria', 'categoria_id', 'id')
	}

	equipamentoSigns() {
		return this.hasMany('App/Models/EquipamentoSign')
	}

	equipamentoProtecoes() {
		return this.hasMany('App/Models/EquipamentoProtecao')
	}

	equipamentoBeneficios() {
		return this.hasMany('App/Models/EquipamentoBeneficio')
	}

	equipamentoRestricaos() {
		return this.hasMany('App/Models/EquipamentoRestricao')
	}

	logs() {
		return this.hasMany('App/Models/EquipamentoLog')
	}
}

module.exports = Equipamento
