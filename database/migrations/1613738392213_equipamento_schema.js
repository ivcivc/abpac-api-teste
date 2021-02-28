'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoSchema extends Schema {
   up() {
      this.table('equipamentos', table => {
         table
            .enu('ratear', ['Não', 'Sim', 'Rateado'], {
               useNative: true,
               existingType: true,
               enumName: 'equipamento_rateio',
            })
            .default('Não')
            .index()

         table.integer('lancamento_id').default(null)
      })
   }

   down() {
      this.table('equipamentos', table => {
         table.dropColumn('ratear')
         table.dropColumn('lancamento_id')
      })
   }
}

module.exports = EquipamentoSchema

