'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LancamentoSchema extends Schema {
	up() {
		this.table('lancamentos', table => {
			table.integer('lancamento_grupo_id').defaultTo(null).index()
			table.decimal('saldoInad', 10, 2).defaultTo(0.0)
		})
	}

	down() {
		this.table('lancamentos', table => {
			// reverse alternations
			table.dropColumn('lancamento_grupo_id')
			table.dropColumn('saldoInad')
		})
	}
}

module.exports = LancamentoSchema
