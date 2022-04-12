'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class LancamentoGrupoItem extends Model {
	lancamento() {
		return this.hasOne('App/Models/Lancamento', 'lancamento_id', 'id')
	}
}

module.exports = LancamentoGrupoItem
