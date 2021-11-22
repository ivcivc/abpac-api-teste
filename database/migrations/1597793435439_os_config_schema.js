'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OsConfigSchema extends Schema {
	up() {
		this.create('os_configs', table => {
			table.increments()

			table.varchar('descricao', 45).unique()

			table
				.enu('rateio', ['Sim', 'Sim - Crédito', 'Não'], {
					useNative: true,
					existingType: true,
					enumName: 'rateio_enu',
				})
				.notNullable()
				.defaultTo('Não')

			table
				.enu('gerarConta', ['Despesa', 'Receita', 'Não'], {
					useNative: true,
					existingType: true,
					enumName: 'gerar_conta_enu',
				})
				.notNullable()
				.defaultTo('Não')

			table
				.integer('conta_id')
				.unsigned()
				.references('id')
				.inTable('contas')
				.onUpdate('CASCADE')
				.onDelete('RESTRICT')

			/*table
      .enu("estoque", ["Entrada", "Baixa","Não"], {
        useNative: true,
        existingType: true,
        enumName: "estoque_enu"
      }).notNullable()
      .defaultTo("Não");*/

			table
				.enu(
					'modelo',
					[
						'Padrão (Ocorrência)',
						'Ordem Serviço (Ocorrência)',
						'Terceiro',
						'Terceiro (Participação)',
						'Participação (Ocorrência)',
						'Salvado (Ocorrência)',
						'Indenização (Ocorrência)',
						'Adesão',
						'Assistencia 24h',
						'Localizador/Bloqueador',
						'Entrada Estoque',
						'Livre',
					],
					{
						useNative: true,
						existingType: true,
						enumName: 'modelo_enu',
					}
				)
				.notNullable()
				.defaultTo('Padrão (Ocorrência)')

			table
				.integer('beneficio_id')
				.unsigned()
				.references('id')
				.inTable('beneficios')
				.onUpdate('CASCADE')
				.onDelete('RESTRICT')

			table
				.integer('planoDeConta_id')
				.unsigned()
				.references('id')
				.inTable('plano_de_contas')
				.onUpdate('CASCADE')
				.onDelete('RESTRICT')

			table
				.enu('status', ['Ativo', 'Inativo'], {
					useNative: true,
					existingType: true,
					enumName: 'status_enu',
				})
				.notNullable()
				.defaultTo('Ativo')

			table.timestamps()
		})
	}

	down() {
		this.drop('os_configs')
	}
}

module.exports = OsConfigSchema
