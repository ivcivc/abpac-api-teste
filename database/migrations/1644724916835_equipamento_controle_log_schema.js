'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoControleLogSchema extends Schema {
	up() {
		this.create('equipamento_controle_logs', table => {
			table.increments()

			table.varchar('field', 30)
			table.text('valueOld', 30)
			table.text('valueNew', 30)

			table
				.integer('equipamento_controle_id')
				.unsigned()
				.references('id')
				.inTable('equipamento_controles')
				.index()
				.onUpdate('CASCADE')
				.onDelete('SET NULL')

			table.integer('user_id').notNullable()

			table.timestamps()
		})
	}

	down() {
		this.drop('equipamento_controle_logs')
	}
}

module.exports = EquipamentoControleLogSchema
