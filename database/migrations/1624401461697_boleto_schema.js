'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BoletoSchema extends Schema {
  up () {
    this.table('boletos', (table) => {
       table.varchar('boleto_nota3', 80)
       table.varchar('linhaDigitavel',50)
       table.boolean('isOpenBank').default(false)
    })
  }

  down () {
    this.table('boletos', (table) => {
       table.dropColumn('boleto_nota3')
       table.dropColumn('linhaDigitavel')
       table.dropColumn('isOpenBank')
    })
  }
}

module.exports = BoletoSchema
