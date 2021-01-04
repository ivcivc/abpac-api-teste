'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OrdemServicoSchema extends Schema {
   up() {
      this.create('ordem_servicos', table => {
         table.increments()

         table.integer('rateio_id').index()

         table
            .integer('pessoa_id')
            .unsigned()
            .references('id')
            .inTable('pessoas')
         //table.boolean('isFornecedor').defaultTo(false)

         table
            .integer('config_id')
            .unsigned()
            .references('id')
            .inTable('os_configs')

         table
            .integer('user_id')
            .unsigned()
            .references('id')
            .inTable('users')
            .notNullable()

         //table.integer('user_id').notNullable()

         //table.varchar('descricao', 45)

         /*table
            .enu(
               'modelo',
               [
                  'Padrão',
                  'Ordem Serviço',
                  'Terceiro',
                  'Participação',
                  'Salvado',
                  'Indenização',
                  'Adesão',
                  'Entrada Estoque',
               ],
               {
                  useNative: true,
                  existingType: true,
                  enumName: 'os_modelo_enu',
               }
            )
            .notNullable()
            .defaultTo('Padrão')*/

         table.date('dCompetencia').defaultTo(null)

         //table.boolean('isFluxoCaixa').defaultTo(true)

         table
            .integer('ocorrencia_id')
            .unsigned()
            .references('id')
            .inTable('ocorrencias')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('ocorrencia_terceiro_id')
            .unsigned()
            .references('id')
            .inTable('ocorrencia_terceiros')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('equipamento_id')
            .unsigned()
            .references('id')
            .inTable('equipamentos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .enu(
               'status',
               ['Em espera', 'Em execução', 'Finalizado', 'Cancelado'],
               {
                  useNative: true,
                  existingType: true,
                  enumName: 'status_enu',
               }
            )
            .notNullable()
            .defaultTo('Em espera')

         table.float('valorSubtotal').defaultTo(0.0)
         table.float('valorDesconto').defaultTo(0.0)
         table.float('valorTotal').defaultTo(0.0)

         table.boolean('isPagar').defaultTo(false)
         table.boolean('isReceber').defaultTo(false)
         table.boolean('isRatear').defaultTo(false)
         table.boolean('isCredito').defaultTo(false)

         //table.unique(['descricao', 'tipo'])

         table.timestamps()
      })
   }

   down() {
      this.drop('ordem_servicos')
   }
}

module.exports = OrdemServicoSchema
