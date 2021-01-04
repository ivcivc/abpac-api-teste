'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioSchema extends Schema {
   up() {
      this.create('rateios', table => {
         table.increments()

         table.date('dInicio').defaultTo(null).index()
         table.date('dFim').defaultTo(null).index()

         table.date('dVencimento').defaultTo(null)
         table.date('dCompetencia').defaultTo(null)

         table
            .integer('conta_id')
            .unsigned()
            .references('id')
            .inTable('contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(null)

         table
            .enu('status', ['Aberto', 'Concluido', 'Financeiro', 'Cancelado'], {
               useNative: true,
               existingType: true,
               enumName: 'rateio_status',
            })
            .notNullable()
            .defaultTo('Aberto')
            .index()

         table.timestamps()
      })
   }

   down() {
      this.drop('rateios')
   }
}

module.exports = RateioSchema
