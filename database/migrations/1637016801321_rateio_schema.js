'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioSchema extends Schema {
	up() {
		this.table('rateios', table => {
			table.integer('equipaAtivos').index()
		})
	}

	down() {
		this.table('rateios', table => {
			// reverse alternations
			table.dropColumn('equipaAtivos')
		})
	}
}

module.exports = RateioSchema
