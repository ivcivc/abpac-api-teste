'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LancamentoGrupoSchema extends Schema {
	up() {
		this.create('lancamento_grupos', table => {
			table.increments()

			table.decimal('saldoTotalInad', 10, 2).defaultTo(0.0)
			table.decimal('valorTotal', 10, 2).defaultTo(0.0)
			table.varchar('tipo', 30)

			table.varchar('status', 30)

			table.text('obs')

			table.timestamps()
		})
	}

	down() {
		this.drop('lancamento_grupos')
	}
}

module.exports = LancamentoGrupoSchema
