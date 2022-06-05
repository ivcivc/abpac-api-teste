'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class PessoaSign extends Model {
	preCadastro() {
		return this.hasOne('App/Models/Pessoa')
	}

	signs() {
		return this.hasMany('App/Models/Sign', 'sign_id', 'id')
	}

	pessoa() {
		return this.belongsTo('App/Models/Pessoa', 'pessoa_id', 'id')
	}
}

module.exports = PessoaSign
