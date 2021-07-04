'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LancamentoSchema extends Schema {
  up() {
    this.table('lancamentos', table => {
       table.boolean('isRelatorio').default(false)
    })
 }

 down() {
    this.table('lancamentos', table => {
       table.dropColumn('isRelatorio')
    })
 }
}

module.exports = LancamentoSchema
