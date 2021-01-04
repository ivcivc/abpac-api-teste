'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BoletoConfigSchema extends Schema {
   up() {
      this.create('boleto_configs', table => {
         table.increments()

         table.integer('nossoNumero').default(1)
         table.string('modelo', 30).notNullable()

         table.timestamps()
      })
   }

   down() {
      this.drop('boleto_configs')
   }
}

module.exports = BoletoConfigSchema
