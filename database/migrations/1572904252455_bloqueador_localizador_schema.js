'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BloqueadorLocalizadorSchema extends Schema {
  up () {
    this.create('bloqueador_localizadors', (table) => {
      table.increments()

      table.varchar("nome", 40).notNullable().unique()

      table
        .enu("status", ["Ativo", "Inativo"], {
          useNative: true,
          existingType: true,
          enumName: "bloq_localizador_status"
        })
        .notNullable()
        .defaultTo("Ativo");


      table.timestamps()
    })
  }

  down () {
    this.drop('bloqueador_localizadors')
  }
}

module.exports = BloqueadorLocalizadorSchema
