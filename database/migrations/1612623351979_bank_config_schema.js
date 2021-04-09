'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BankConfigSchema extends Schema {
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

         table.string('recurso', 100).index()

         table.string('refreshToken', 60)

         table.string('token', 60)

         table.datetime('Validate')
         table.datetime('authValidate')

         table.timestamps()
      })
   }

   down() {
      this.drop('bank_configs')
   }
}

module.exports = BankConfigSchema
