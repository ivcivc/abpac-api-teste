'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioEquipamentoSchema extends Schema {
   up() {
      this.table('rateio_equipamentos', table => {
         table
            .integer('equipamento_id_principal')
            .unsigned()
            .index()
            .defaultTo(null)
      })
   }

   down() {
      this.table('rateio_equipamentos', table => {
         table.dropColumn('equipamento_id_principal')
      })
   }
}

module.exports = RateioEquipamentoSchema
