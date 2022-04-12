'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioEquipamentoBaixaSchema extends Schema {
	up() {
		this.table('rateio_equipamento_baixas', table => {
			table.decimal('valorMercado1', 10, 2).defaultTo(0.0)
		})
	}

	down() {
		this.table('rateio_equipamento_baixas', table => {
			table.dropColumn('valorMercado1')
		})
	}
}

module.exports = RateioEquipamentoBaixaSchema
