'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoEndossoSchema extends Schema {
	up() {
		this.table('equipamento_endossos', table => {
			table.integer('sign_id').index()
		})
	}

	down() {
		this.table('equipamento_endossos', table => {
			table.dropColumn('sign_id')
		})
	}
}

module.exports = EquipamentoEndossoSchema
