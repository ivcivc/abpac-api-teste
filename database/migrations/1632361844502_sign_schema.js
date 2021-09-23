'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SignSchema extends Schema {
	up() {
		this.table('signs', table => {
			// alter table
			table.text('link').defaultTo(null)
		})
	}

	down() {
		this.table('signs', table => {
			// reverse alternations
			table.dropColumn('link')
		})
	}
}

module.exports = SignSchema
