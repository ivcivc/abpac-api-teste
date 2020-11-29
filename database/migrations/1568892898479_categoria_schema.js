'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CategoriaSchema extends Schema {
   up() {
      this.create('categorias', table => {
         table.increments()

         table.varchar('nome', 55).unique()
         table.varchar('descricao', 150)

         table
            .enu('tipo', ['Rebocador', 'Semi-Reboque', 'Caminhão'], {
               useNative: true,
               existingType: true,
               enumName: 'categoria_tipo',
            })
            .notNullable()
            .defaultTo('Rebocador')

         table.float('valorTaxaAdm', 8, 2).defaultTo(0.0)
         table.float('percentualRateio', 6, 2).defaultTo(0.0)

         table
            .enu('status', ['Ativo', 'Inativo'], {
               useNative: true,
               existingType: true,
               enumName: 'categoria_status',
            })
            .notNullable()
            .defaultTo('Ativo')

         table.timestamps()
      })
   }

   down() {
      this.drop('categorias')
   }
}

module.exports = CategoriaSchema
