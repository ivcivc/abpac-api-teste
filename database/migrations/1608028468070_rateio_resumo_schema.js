'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioResumoSchema extends Schema {
   up() {
      this.create('rateio_resumos', table => {
         table.increments()

         table
            .integer('rateio_id')
            .unsigned()
            .references('id')
            .inTable('rateios')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(0)

         table.integer('qtd').defaultTo(0)

         table.string('grupo', 45).notNullable()
         table.string('subGrupo', 45).notNullable()

         table.float('valor', 10, 2).defaultTo(0.0)

         table.timestamps()
      })
   }

   down() {
      this.drop('rateio_resumos')
   }
}

module.exports = RateioResumoSchema
