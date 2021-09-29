'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SignSchema extends Schema {
	up() {
		this.table('signs', table => {
			// alter table
			table.varchar('signatarioTel', 15).defaultTo(null)
			table.varchar('dispositivo', 10).defaultTo(null)
		})
	}

	down() {
		this.table('signs', table => {
			// reverse alternations
			table.dropColumn('signatarioTel')
			table.dropColumn('dispositivo')
		})
	}
}

module.exports = SignSchema
