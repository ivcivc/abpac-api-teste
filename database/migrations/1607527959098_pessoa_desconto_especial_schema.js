'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PessoaDescontoEspecialSchema extends Schema {
   up() {
      this.table('pessoas', table => {
         // alter table
         table.float('descontoEspecial', 6, 2).defaultTo(0.0)
      })
   }

   down() {
      this.table('pessoas', table => {
         table.dropColumn('descontoEspecial')
      })
   }
}

module.exports = PessoaDescontoEspecialSchema
