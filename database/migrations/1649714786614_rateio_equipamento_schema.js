'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioEquipamentoSchema extends Schema {
	up() {
		this.table('rateio_equipamentos', table => {
			table.decimal('valorMercado1', 10, 2).defaultTo(0.0)
			// alter table
		})
	}

	down() {
		this.table('rateio_equipamentos', table => {
			// reverse alternations
			table.dropColumn('valorMercado1')
		})
	}
}

module.exports = RateioEquipamentoSchema
