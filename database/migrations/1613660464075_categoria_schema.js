'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CategoriaSchema extends Schema {
   up() {
      this.table('categorias', table => {
         table.decimal('valorMercadoInicio', 11, 2).defaultTo(0.0)
      })
      this.table('categorias', table => {
         table.decimal('valorMercadoFim', 11, 2).defaultTo(0.0)
      })
   }

   down() {
      this.table('categorias', table => {
         table.dropColumn('valorMercadoInicio')
         table.dropColumn('valorMercadoFim')
      })
   }
}

module.exports = CategoriaSchema
