'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PendenciaSetupSchema extends Schema {
  up () {
    this.create('pendencia_setups', (table) => {
      table.increments()

      table.varchar("descricao", 40)
      /*table
         .enu("disparo", ["email", "sms", "email_sms",'manual'], {
           useNative: true,
           existingType: true,
           enumName: "enu_disparo"
         })
         .notNullable()
         .defaultTo("manual")*/


      /*table
         .text('modelo')*/

      table
         .enu("status", ["Ativo", "Inativo"], {
           useNative: true,
           existingType: true,
           enumName: "enu_status"
         })
         .notNullable()
         .defaultTo("Ativo").index();

      table.varchar("modulo").notNullable()

      table.varchar("modelo")

      table.unique(['descricao', 'modulo'])

      table.text("obs")

      table.timestamps()
    })
  }

  down () {
    this.drop('pendencia_setups')
  }
}

module.exports = PendenciaSetupSchema
