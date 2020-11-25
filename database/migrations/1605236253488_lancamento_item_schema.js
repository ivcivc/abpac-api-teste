'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LancamentoItemSchema extends Schema {
   up() {
      this.create('lancamento_items', table => {
         table.increments()

         table
            .enu('DC', ['C', 'D'], {
               useNative: true,
               existingType: true,
               enumName: 'lanca_item_dc',
            })
            .notNullable()
            .index()

         table
            .enu(
               'tag',
               ['CA', 'CD', 'QA', 'QD', 'QP', 'LF', 'LL', 'IC', 'ID'],
               {
                  useNative: true,
                  existingType: true,
                  enumName: 'lanca_item_tag',
               }
            )
            .notNullable()
            .index()

         table.varchar('descricao', 40)

         table
            .integer('planoDeConta_id')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .notNullable()

         table.float('valor').defaultTo(0.0)

         table
            .integer('lancamento_id')
            .unsigned()
            .references('id')
            .inTable('lancamentos')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')
            .notNullable()

         table.timestamps()
      })
   }

   down() {
      this.drop('lancamento_items')
   }
}

module.exports = LancamentoItemSchema
