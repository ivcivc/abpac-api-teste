'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OrdemServicoSchema extends Schema {
   up() {
      this.table('ordem_servicos', table => {
         // alter table
         table.integer('preCadastro_id', 15).notNullable().index()
      })
   }

   down() {
      this.table('ordem_servicos', table => {
         // reverse alternations
         table.dropColumn('preCadastro_id')
      })
   }
}

module.exports = OrdemServicoSchema
