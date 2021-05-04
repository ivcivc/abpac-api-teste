'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EmailLogSchema extends Schema {
   up() {
      this.table('email_logs', table => {
         table.varchar('tipo', 10).default('email')
      })
   }

   down() {
      this.table('email_logs', table => {
         table.dropColumn('tipo')
      })
   }
}

module.exports = EmailLogSchema
