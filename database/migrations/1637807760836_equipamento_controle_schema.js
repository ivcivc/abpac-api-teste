'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoControleSchema extends Schema {
	up() {
		this.create('equipamento_controles', table => {
			table.increments()

			table.varchar('descricao', 45)
			table.varchar('motivo', 30).index()
			table.varchar('acao', 15).index()
			table.varchar('tipo', 30).index()
			table.text('obs', 30)

			table
				.integer('pessoa_id')
				.unsigned()
				.references('id')
				.inTable('pessoas')

			table
				.integer('equipamento_protecao_id')
				.unsigned()
				.references('id')
				.inTable('equipamento_protecaos')
				.index()
				.onUpdate('CASCADE')
				.onDelete('SET NULL')

			table
				.integer('equipamento_beneficio_id')
				.unsigned()
				.references('id')
				.inTable('equipamento_beneficios')
				.index()
				.onUpdate('CASCADE')
				.onDelete('SET NULL')

			table
				.integer('equipamento_id')
				.unsigned()
				.references('id')
				.inTable('equipamentos')
				.index()
				.onUpdate('CASCADE')
				.onDelete('SET NULL')

			table.varchar('status', 20).index()

			table.integer('user_id').notNullable()

			table.timestamps()
		})
	}

	down() {
		this.drop('equipamento_controles')
	}
}

module.exports = EquipamentoControleSchema
