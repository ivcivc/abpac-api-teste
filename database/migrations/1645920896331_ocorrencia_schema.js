'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OcorrenciaSchema extends Schema {
	up() {
		this.table('ocorrencias', table => {
			table.varchar('atender', 10).index().defaultTo('Associado')
		})
	}

	down() {
		this.table('ocorrencias', table => {
			table.dropColumn('atender')
		})
	}
}

module.exports = OcorrenciaSchema
