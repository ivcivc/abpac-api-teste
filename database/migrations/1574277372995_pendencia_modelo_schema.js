'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PendenciaModeloSchema extends Schema {
  up () {
    this.create('pendencia_modelos', (table) => {
      table.increments()

      table.varchar("descricao", 40)

      table
         .text('arquivo')

      table
         .enu("status", ["Ativo", "Inativo"], {
           useNative: true,
           existingType: true,
           enumName: "enu_status"
         })
         .notNullable()
         .defaultTo("Ativo").index();

      table.text("obs")

      table.timestamps()
    })
  }

  down () {
    this.drop('pendencia_modelos')
  }
}

module.exports = PendenciaModeloSchema
