'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CategoriaSchema extends Schema {
   up() {
      this.table('categorias', table => {
         // alter table
         table.decimal('valorAdesao', 11, 2).defaultTo(0.0)
      })
   }

   down() {
      this.table('categorias', table => {
         // reverse alternations
         this.drop('valorAdesao')
      })
   }
}

module.exports = CategoriaSchema
