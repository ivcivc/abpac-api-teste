'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SignSchema extends Schema {
	up() {
		this.table('signs', table => {
			// alter table
			table.json('dataJson')
		})
	}

	down() {
		this.table('signs', table => {
			// reverse alternations
			table.dropColumn('dataJson')
		})
	}
}

module.exports = SignSchema
