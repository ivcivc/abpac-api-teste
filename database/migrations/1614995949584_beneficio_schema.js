'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BeneficioSchema extends Schema {
   up() {
      this.table('beneficios', table => {
         table
            .integer('planoDeConta_id')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
      })
   }

   down() {
      this.table('beneficios', table => {
         table.dropColumn('planoDeConta_id')
      })
   }
}

module.exports = BeneficioSchema
