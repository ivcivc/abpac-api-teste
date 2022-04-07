'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class LancamentoGrupo extends Model {
	items() {
		return this.hasMany('App/Models/LancamentoGrupoItem')
	}
}

module.exports = LancamentoGrupo
