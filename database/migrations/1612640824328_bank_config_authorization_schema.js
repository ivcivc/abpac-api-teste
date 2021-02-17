'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BankConfigAuthorizationSchema extends Schema {
   up() {
      this.create('bank_config_authorizations', table => {
         table.increments()

         table
            .integer('bank_config_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('bank_configs')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')

         table.string('categoria', 30)

         table.string('refreshToken', 60)
         table.datetime('refreshTokenValidate')

         table.string('token', 60)
         table.datetime('tokenValidate')

         table.timestamps()
      })
   }

   down() {
      this.drop('bank_config_authorizations')
   }
}

module.exports = BankConfigAuthorizationSchema
