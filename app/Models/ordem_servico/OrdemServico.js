'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class OrdemServico extends Model {
	items() {
		return this.hasMany('App/Models/ordem_servico/OrdemServicoItem')
	}

	pessoa() {
		return this.hasOne('App/Models/Pessoa', 'pessoa_id', 'id')
	}

	/*terceiro() {
      return this.hasOne(
         'App/Models/OcorrenciaTerceiro',
         'ocorrencia_terceiro_id',
         'id'
      )
   }*/

	ocorrencia() {
		return this.hasOne('App/Models/Ocorrencia', 'ocorrencia_id', 'id')
	}

	user() {
		return this.hasOne('App/Models/User', 'user_id', 'id')
	}

	config() {
		return this.hasOne('App/Models/ordem_servico/OsConfig', 'config_id', 'id')
	}

	lancamentos() {
		return this.hasMany('App/Models/Lancamento') //, 'ordem_servico_id', 'id'
	}

	equipamento() {
		return this.hasOne('App/Models/Equipamento', 'equipamento_id', 'id')
	}

	terceiro() {
		return this.hasOne(
			'App/Models/OcorrenciaTerceiro',
			'ocorrencia_terceiro_id',
			'id'
		)
	}

	/*statuses () {
      return this.hasMany('App/Models/OcorrenciaStatus')
   }

   pessoa() {
      return this.hasOne('App/Models/Pessoa', 'pessoa_id','id')
   }

   causa() {
      return this.hasOne('App/Model/Ocorrencia')
   }*/
}

module.exports = OrdemServico
