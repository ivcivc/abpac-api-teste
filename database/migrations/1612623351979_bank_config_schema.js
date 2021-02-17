'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BankSicoobConfigSchema extends Schema {
   up() {
      this.create('bank_configs', table => {
         table.increments()

         table
            .integer('conta_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('contas')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')

         table.string('cooperativa', 8)
         table.string('senha', 20)
         table.string('chaveAcesso', 15)
         table.string('tokenBasic', 100)
         table.string('clientID', 400)
         table.string('clientSecret', 100), table.string('urlAuthorize', 200)
         table.string('urlCallback', 100)
         table.string('urlAccessToken', 200)
         table.string('urlRefreshToken', 200)

         table.boolean('isFake').default(true)

         table.timestamps()
      })
   }

   down() {
      this.drop('bank_configs')
   }
}

module.exports = BankSicoobConfigSchema
