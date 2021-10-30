'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EstoqueSchema extends Schema {
	up() {
		this.create('estoques', table => {
			table.increments()

			table.integer('quantidade').defaultTo(1)
			table.varchar('descricao', 50).notNullable()

			table.decimal('subtotal').defaultTo(0.0)
			table.decimal('total').defaultTo(0.0)

			table
				.integer('entrada_id')
				.unsigned()
				.references('id')
				.inTable('ordem_servico_items')
				.onUpdate('CASCADE')
				.onDelete('CASCADE')

			table
				.integer('saida_id')
				.unsigned()
				.references('id')
				.inTable('ordem_servico_items')
				.onUpdate('CASCADE')
				.onDelete('CASCADE')

			table.timestamps()
		})
	}

	down() {
		this.drop('estoques')
	}
}

module.exports = EstoqueSchema
