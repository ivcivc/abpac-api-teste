'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoEndossoSchema extends Schema {
	up() {
		this.create('equipamento_endossos', table => {
			table.increments()

			table
				.integer('pessoa_id')
				.unsigned()
				.references('id')
				.inTable('pessoas')

			table.varchar('tipo', 40).index()
			table.integer('sai_id').index()
			table.varchar('status', 15).notNullable().defaultTo('Ativo').index()

			table.timestamps()
		})
	}

	down() {
		this.drop('equipamento_endossos')
	}
}

module.exports = EquipamentoEndossoSchema
