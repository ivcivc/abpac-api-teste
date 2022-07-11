'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PessoaSchema extends Schema {
	up() {
		this.table('pessoas', table => {
			table.text('email_sign')
		})
	}

	down() {
		this.table('pessoas', table => {
			table.dropColumn('email_sign')
		})
	}
}

module.exports = PessoaSchema
