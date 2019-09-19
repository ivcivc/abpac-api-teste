'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CategoriaSchema extends Schema {
  up () {
    this.create('categorias', (table) => {

      table.varchar("nome", 20).unique();
      table.varchar("descricao", 150);

      table
        .enu("tipo", ["Rebocador", "Semi-Reboque", "Caminhão"], {
          useNative: true,
          existingType: true,
          enumName: "categoria_tipo"
        })
        .notNullable()
        .defaultTo("Rebocador");

      table
        .enu("status", ["Ativo", "Inativo"], {
          useNative: true,
          existingType: true,
          enumName: "categoria_status"
        })
        .notNullable()
        .defaultTo("Ativo");



      table.increments()
      table.timestamps()
    })
  }

  down () {
    this.drop('categorias')
  }
}

module.exports = CategoriaSchema
