'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoEndossoSchema extends Schema {
	up() {
		this.table('equipamento_endossos', table => {
			table.json('saiJson')
			table.json('equipaJson')
		})
	}

	down() {
		this.table('equipamento_endossos', table => {
			table.dropColumn('equipaJson')
			table.dropColumn('saiJson')
		})
	}
}

module.exports = EquipamentoEndossoSchema
