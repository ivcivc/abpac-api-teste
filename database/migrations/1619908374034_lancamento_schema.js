'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LancamentoSchema extends Schema {
   up() {
      this.table('lancamentos', table => {
         table.boolean('isZap').default(false)
      })
   }

   down() {
      this.table('lancamentos', table => {
         table.dropColumn('isZap')
      })
   }
}

module.exports = LancamentoSchema
