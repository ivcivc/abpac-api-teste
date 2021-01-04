'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EmailLogSchema extends Schema {
   up() {
      this.create('email_logs', table => {
         table.increments()

         table
            .integer('boleto_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('boletos')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')

         table.text('mensagem')

         table.text('response')

         table.varchar('status', 10)

         table.timestamps()
      })
   }

   down() {
      this.drop('email_logs')
   }
}

module.exports = EmailLogSchema
