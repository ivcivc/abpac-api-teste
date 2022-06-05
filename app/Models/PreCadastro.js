'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class PreCadastro extends Model {
	pessoa() {
		return this.hasOne('App/Models/Pessoa', 'pessoa_id', 'id')
	}
}

module.exports = PreCadastro
