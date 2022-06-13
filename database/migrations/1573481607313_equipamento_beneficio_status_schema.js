'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoBeneficioStatusSchema extends Schema {
	up() {
		this.create('equipamento_beneficio_statuses', table => {
			table.increments()

			table.varchar('motivo', 250)

			table
				.enu('status', ['Ativo', 'Inativo', 'Cancelado'], {
					useNative: true,
					existingType: true,
					enumName: 'equipamento_beneficio_status',
				})
				.notNullable()
				.defaultTo('Ativo')

			table
				.integer('equipamento_beneficio_id')
				.unsigned()
				.notNullable()
				.references('id')
				.inTable('equipamento_beneficios')
				.onUpdate('CASCADE')
				.onDelete('RESTRICT')

			table.integer('user_id').notNullable()

			table.timestamps()
		})
	}

	down() {
		this.drop('equipamento_beneficio_statuses')
	}
}

module.exports = EquipamentoBeneficioStatusSchema
