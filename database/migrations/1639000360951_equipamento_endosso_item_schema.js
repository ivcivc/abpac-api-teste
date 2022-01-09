'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoEndossoItemSchema extends Schema {
	up() {
		this.create('equipamento_endosso_items', table => {
			table.increments()

			table
				.integer('equipa_endosso_id')
				.unsigned()
				.notNullable()
				.references('id')
				.inTable('equipamento_endossos')
				.onUpdate('CASCADE')
				.onDelete('CASCADE')

			table
				.integer('equipamento_id')
				.unsigned()
				.notNullable()
				.references('id')
				.inTable('equipamentos')
				.onUpdate('CASCADE')
				.onDelete('CASCADE')

			table.decimal('valorRateio', 10, 2).defaultTo(0.0)

			table.timestamps()
		})
	}

	down() {
		this.drop('equipamento_endosso_items')
	}
}

module.exports = EquipamentoEndossoItemSchema
