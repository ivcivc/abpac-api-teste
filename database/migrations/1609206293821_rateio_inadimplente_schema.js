'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioInadimplenteSchema extends Schema {
   up() {
      this.create('rateio_inadimplentes', table => {
         table.increments()

         table
            .integer('rateio_id')
            .unsigned()
            .references('id')
            .inTable('rateios')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('lancamento_id')
            .unsigned()
            .references('id')
            .inTable('lancamentos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .notNullable()

         table.varchar('tipo', 7)
         table.float('valorTotal', 10, 2).defaultTo(0.0)

         table.timestamps()
      })
   }

   down() {
      this.drop('rateio_inadimplentes')
   }
}

module.exports = RateioInadimplenteSchema
