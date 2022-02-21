'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoBeneficioLogSchema extends Schema {
	up() {
		this.create('equipamento_beneficio_logs', table => {
			table.increments()

			table.varchar('field', 30)
			table.text('valueOld', 30)
			table.text('valueNew', 30)

			table
				.integer('equipamento_beneficio_id')
				.unsigned()
				.references('id')
				.inTable('equipamento_beneficios')
				.index()
				.onUpdate('CASCADE')
				.onDelete('SET NULL')

			table.integer('user_id').notNullable()

			table.boolean('isVisible').defaultTo(true)

			table.timestamps()
		})
	}

	down() {
		this.drop('equipamento_beneficio_logs')
	}
}

module.exports = EquipamentoBeneficioLogSchema
