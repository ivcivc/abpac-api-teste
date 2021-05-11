'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EmailLogSchema extends Schema {
   up() {
      this.table('email_logs', table => {
         table.integer('pessoa_id').index()
      })
   }

   down() {
      this.table('email_logs', table => {
         table.dropColumn('pessoa_id')
      })
   }
}

module.exports = EmailLogSchema
