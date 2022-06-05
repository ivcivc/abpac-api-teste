'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Sign extends Model {
	sign() {
		return this.belongsTo('App/Models/Sign', 'sign_id', 'id')
	}

	logs() {
		return this.hasMany('App/Models/SignLog')
	}

	pessoa_sign() {
		return this.hasOne('App/Models/PessoaSign')
	}

	equipamento_signs() {
		return this.hasMany('App/Models/EquipamentoSign', 'id', 'sign_id')
	}

	equipamento_endossos() {
		return this.hasMany('App/Models/EquipamentoEndosso', 'id', 'sign_id')
	}

	galerias() {
		return this.hasMany('App/Models/FileItem', 'id', 'sign_id')
	}
}

module.exports = Sign
