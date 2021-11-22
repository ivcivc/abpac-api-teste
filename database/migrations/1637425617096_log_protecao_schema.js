'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LogProtecaoSchema extends Schema {
	up() {
		this.create('log_protecaos', table => {
			table.increments()

			table.varchar('field', 30)
			table.text('valueOld', 30)
			table.text('valueNew', 30)

			table
				.integer('equipamento_protecao_id')
				.unsigned()
				.references('id')
				.inTable('equipamento_protecaos')
				.index()
				.onUpdate('CASCADE')
				.onDelete('SET NULL')

			table.integer('user_id').notNullable()

			table.timestamps()
		})
	}

	down() {
		this.drop('log_protecaos')
	}
}

module.exports = LogProtecaoSchema
