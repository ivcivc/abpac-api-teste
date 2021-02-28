'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioEquipamentoSchema extends Schema {
   up() {
      this.table('rateio_equipamentos', table => {
         table
            .enu('baixa', ['Não', 'Sim'], {
               useNative: true,
               existingType: true,
               enumName: 'equipa_baixado',
            })
            .notNullable()
            .defaultTo('Não')
            .index()

         table.date('dEndosso').defaultTo(null)
      })
   }

   down() {
      this.table('rateio_equipamentos', table => {
         table.dropColumn('baixa')
         table.dropColumn('dEndosso')
      })
   }
}

module.exports = RateioEquipamentoSchema
