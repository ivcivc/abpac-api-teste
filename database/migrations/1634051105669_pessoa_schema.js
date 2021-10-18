'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PessoaSchema extends Schema {
	up() {
		this.table('pessoas', table => {
			// alter table.defaultTo(null)
			table.varchar('signatarioNome', 70).defaultTo(null)
			table.varchar('signatarioCpf', 11).defaultTo(null)
			table.varchar('dispositivo', 10).defaultTo(null)
		})
	}

	down() {
		this.table('pessoas', table => {
			// reverse alternations
			table.dropColumn('signatarioNome')
			table.dropColumn('signatarioCpf')
			table.dropColumn('dispositivo')
		})
	}
}

module.exports = PessoaSchema
