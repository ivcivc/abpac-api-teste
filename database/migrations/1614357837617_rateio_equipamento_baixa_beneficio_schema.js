'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioEquipamentoBaixaBeneficioSchema extends Schema {
   up() {
      this.create('rateio_equipamento_baixa_beneficios', table => {
         table.increments()
         table
            .integer('equipa_baixa_id')
            .unsigned()
            .references('id')
            .inTable('rateio_equipamento_baixas')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')
            .defaultTo(null)

         table.string('beneficio', 45).notNullable().index()
         table.string('modelo', 30).notNullable().index()
         table.decimal('valor', 10, 2).defaultTo(0.0)

         table.timestamps()
      })
   }

   down() {
      this.drop('rateio_equipamento_baixa_beneficios')
   }
}

module.exports = RateioEquipamentoBaixaBeneficioSchema
