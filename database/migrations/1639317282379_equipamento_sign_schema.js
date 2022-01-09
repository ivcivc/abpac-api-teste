'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoSignSchema extends Schema {
	up() {
		this.table('equipamento_signs', table => {
			table.integer('equipa_endosso_id').index()
		})
	}

	down() {
		this.table('equipamento_signs', table => {
			table.dropColumn('equipa_endosso_id')
		})
	}
}

module.exports = EquipamentoSignSchema
