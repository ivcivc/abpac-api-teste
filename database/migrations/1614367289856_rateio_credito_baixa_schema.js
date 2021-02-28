'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioCreditoBaixaSchema extends Schema {
   up() {
      this.create('rateio_credito_baixas', table => {
         table.increments()

         table
            .integer('rateio_id')
            .unsigned()
            .references('id')
            .inTable('rateios')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(null)

         table.date('dRecebimento')
         table.date('dEndosso')

         table.integer('lancamento_id')

         table.integer('pessoa_id')
         table.string('pessoa_nome', 50)
         table.string('placa', 10, 2)

         table.decimal('valorCredito', 10, 2)

         table.timestamps()
      })
   }

   down() {
      this.drop('rateio_credito_baixas')
   }
}

module.exports = RateioCreditoBaixaSchema
