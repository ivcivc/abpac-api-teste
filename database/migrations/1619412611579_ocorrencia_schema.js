'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OcorrenciaSchema extends Schema {
   up() {
      this.table('ocorrencias', table => {
         table.decimal('custoEstimado', 10, 2).default(0.0)
      })
   }

   down() {
      this.table('ocorrencias', table => {
         table.dropColumn('custoEstimado')
      })
   }
}

module.exports = OcorrenciaSchema
