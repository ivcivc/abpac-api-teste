'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OrdemServicoSchema extends Schema {
	up() {
		this.table('ordem_servicos', table => {
			table.varchar('beneficio_nome', 45).defaultTo(null)
			table.integer('beneficio_id').defaultTo(null)
			table.integer('planoDeConta_id').defaultTo(null)
		})
	}

	down() {
		this.table('ordem_servicos', table => {
			table.dropColumn('beneficio_nome')
			table.dropColumn('beneficio_id')
			table.dropColumn('planoDeConta_id')
		})
	}
}

module.exports = OrdemServicoSchema
