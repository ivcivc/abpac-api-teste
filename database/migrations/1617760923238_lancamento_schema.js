'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LancamentoSchema extends Schema {
   up() {
      this.table('lancamentos', table => {
         table.string('endosso_id', 15).default(null).index()
      })
   }

   down() {
      this.table('lancamentos', table => {
         table.dropColumn('endosso_id')
      })
   }
}

module.exports = LancamentoSchema
