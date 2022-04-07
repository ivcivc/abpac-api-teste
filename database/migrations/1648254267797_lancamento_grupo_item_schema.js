'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LancamentoGrupoItemSchema extends Schema {
	up() {
		this.create('lancamento_grupo_items', table => {
			table.increments()

			table
				.integer('lancamento_grupo_id')
				.unsigned()
				.references('id')
				.inTable('lancamento_grupos')
				.onUpdate('CASCADE')
				.onDelete('CASCADE')
				.defaultTo(null)

			table.integer('lancamento_id').index()
			table.decimal('saldoInad', 10, 2).defaultTo(0.0)
			table.decimal('valor', 10, 2).defaultTo(0.0)

			table.timestamps()
		})
	}

	down() {
		this.drop('lancamento_grupo_items')
	}
}

module.exports = LancamentoGrupoItemSchema
