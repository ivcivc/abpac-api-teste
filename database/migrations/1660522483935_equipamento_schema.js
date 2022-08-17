'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoSchema extends Schema {
	up() {
		this.table('equipamentos', table => {
			table.varchar('placaProvisoria', 8)
		})
	}

	down() {
		this.table('equipamentos', table => {
			table.dropColumn('placaProvisoria')
		})
	}
}

module.exports = EquipamentoSchema
