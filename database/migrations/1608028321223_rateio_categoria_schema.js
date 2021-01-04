'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioCategoriaSchema extends Schema {
   up() {
      this.create('rateio_categorias', table => {
         table.increments()

         table
            .integer('rateio_id')
            .unsigned()
            .references('id')
            .inTable('rateios')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(0)

         table.string('nome', 55).notNullable().index()

         table
            .integer('categoria_id')
            .unsigned()
            .references('id')
            .inTable('categorias')

         table.varchar('abreviado', 5)

         table.integer('grupo')
         table.integer('ordem')
         table.boolean('isEspecial')
         table.boolean('isPrincipal')

         table.float('txAdm', 10, 2).defaultTo(0.0)

         table.integer('qtd')
         table.float('percEditavel', 10, 4).defaultTo(0.0)
         table.float('percentualBase', 10, 4).defaultTo(0.0)
         table.float('percentualEspecial', 10, 4).defaultTo(0.0)
         table.float('valorParcela', 10, 2).defaultTo(0.0)
         table.float('valorTotal', 10, 2).defaultTo(0.0)
         table.float('medio', 10, 2).defaultTo(0.0)

         table.timestamps()
      })
   }

   down() {
      this.drop('rateio_categorias')
   }
}

module.exports = RateioCategoriaSchema
