'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LancamentoSchema extends Schema {
   up() {
      this.table('lancamentos', table => {
         table
            .enu('creditoRateio', ['Não', 'Sim', 'Rateado'], {
               useNative: true,
               existingType: true,
               enumName: 'lancamento_creditoRateio',
            })
            .default('Não')
            .index()

         table.boolean('isBaixa').default(false)
      })
   }

   down() {
      this.table('lancamentos', table => {
         table.dropColumn('creditoRateio')
         table.dropColumn('isBaixa')
      })
   }
}

module.exports = LancamentoSchema
