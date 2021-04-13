'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LancamentoSchema extends Schema {
   up() {
      this.create('lancamentos', table => {
         table.increments()

         table.integer('parent_id').defaultTo(0)

         table
            .enu('tipo', ['Despesa', 'Receita'], {
               useNative: true,
               existingType: true,
               enumName: 'lanca_tipo',
            })
            .notNullable()
            .index()

         table.date('dVencimento').defaultTo(null).index()
         table.date('dCompetencia').defaultTo(null).index()
         table.date('dRecebimento').defaultTo(null).index()

         table.integer('parcelaI')
         table.integer('parcelaF')

         table.integer('rateio_id').index()
         table.varchar('grupo_id', 20).index()
         table.varchar('subGrupo_id', 20).index()

         table.integer('isEmail', 1).defaultTo(0)

         table
            .integer('equipamento_id')
            .unsigned()
            .references('id')
            .inTable('equipamentos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(null)

         table
            .integer('ordem_servico_id')
            .unsigned()
            .references('id')
            .inTable('ordem_servicos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(null)

         table
            .integer('pessoa_id')
            .unsigned()
            .references('id')
            .inTable('pessoas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(null)

         table
            .integer('conta_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(null)

         table.float('valorBase', 10, 2).defaultTo(0.0)
         table.float('valorDesc', 10, 2).defaultTo(0.0)
         table.float('valorAcresc', 10, 2).defaultTo(0.0)
         table.float('valorTotal', 10, 2).defaultTo(0.0)

         table.float('valorCompensado', 10, 2).defaultTo(0.0)
         table.float('valorCompensadoAcresc', 10, 2).defaultTo(0.0)
         table.float('valorCompensadoDesc', 10, 2).defaultTo(0.0)
         table.float('valorCompensadoPrej', 10, 2).defaultTo(0.0)

         table.float('valorDebitoInad', 10, 2).defaultTo(0.0)
         table.float('valorCreditoInad', 10, 2).defaultTo(0.0)

         table.varchar('forma', 20).defaultTo(null)

         table.varchar('historico', 40)
         table.varchar('documento', 15)
         table.varchar('documentoNr', 15)
         table.text('nota')

         table.boolean('isConciliado').defaultTo(false)

         table
            .enu(
               'status',
               [
                  'Aberto',
                  'Acordado',
                  'Inadimplente',
                  'Cancelado',
                  'Compensado',
                  'Bloqueado',
               ],
               {
                  useNative: true,
                  existingType: true,
                  enumName: 'lanca_status',
               }
            )
            .notNullable()
            .defaultTo('Bloqueado')
            .index()

         table
            .enu(
               'situacao',
               [
                  'Aberto',
                  'Acordado',
                  'Inadimplente',
                  'Cancelado',
                  'Compensado',
                  'Bloqueado',
               ],
               {
                  useNative: true,
                  existingType: true,
                  enumName: 'lanca_situacao',
               }
            )
            .notNullable()
            .defaultTo('Bloqueado')
            .index()

         table
            .enu('inadimplente', ['Não', 'Sim', 'Debito', 'Credito'], {
               useNative: true,
               existingType: true,
               enumName: 'lanca_creditoInad',
            })
            .notNullable()
            .defaultTo('Não')
            .index()

         table.timestamps()
      })
   }

   down() {
      this.drop('lancamentos')
   }
}

module.exports = LancamentoSchema
