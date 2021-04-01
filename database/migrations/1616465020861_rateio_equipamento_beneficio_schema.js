'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioEquipamentoBeneficioSchema extends Schema {
   up() {
      this.table('rateio_equipamento_beneficios', table => {
         table
            .integer('planoDeConta_id')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('rateio_id')
            .unsigned()
            .references('id')
            .inTable('rateios')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')
            .defaultTo(null)

         table
            .integer('pessoa_id')
            .unsigned()
            .references('id')
            .inTable('pessoas')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')
            .defaultTo(null)
      })
   }

   down() {
      this.table('rateio_equipamento_beneficios', table => {
         table.dropColumn('planoDeConta_id')
         table.dropColumn('rateio_id')
         table.dropColumn('pessoa_id')
      })
   }
}

module.exports = RateioEquipamentoBeneficioSchema
