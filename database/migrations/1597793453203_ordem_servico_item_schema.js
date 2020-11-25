'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OrdemServicoItemSchema extends Schema {
   up() {
      this.create('ordem_servico_items', table => {
         table.increments()

         table.integer('estoque_id')

         table.integer('quantidade').defaultTo(1)

         table.varchar('descricao', 50).notNullable()

         table.float('valorBase').defaultTo(0.0)
         table.float('percentualBase').defaultTo(0.0)
         table.float('subtotal').defaultTo(0.0)
         table.float('percentualDesc').defaultTo(0.0)
         table.float('total').defaultTo(0.0)

         table
            .integer('ordem_servico_id')
            .unsigned()
            .references('id')
            .inTable('ordem_servicos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table.timestamps()
      })
   }

   down() {
      this.drop('ordem_servico_items')
   }
}

module.exports = OrdemServicoItemSchema
