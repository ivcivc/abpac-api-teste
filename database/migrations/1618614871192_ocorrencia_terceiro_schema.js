'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OcorrenciaTerceiroSchema extends Schema {
   up() {
      this.table('ocorrencia_terceiros', table => {
         table.varchar('patrimonio', 200).default(null).index()
      })
   }

   down() {
      this.table('ocorrencia_terceiros', table => {
         table.dropColumn('patrimonio')
      })
   }
}

module.exports = OcorrenciaTerceiroSchema
