'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoSchema extends Schema {
   up() {
      this.table('equipamentos', table => {
         table.string('endosso_id', 15).default(null).index()
      })
   }

   down() {
      this.table('equipamentos', table => {
         table.dropColumn('endosso_id')
      })
   }
}

module.exports = EquipamentoSchema
