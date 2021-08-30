'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SignLogSchema extends Schema {
   up() {
      this.create('sign_logs', table => {
         table.increments()

         table
            .integer('sign_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('signs')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')

         table.varchar('tipoEnvio', 20)
         table.varchar('ip', 20)
         table.text('hostname')

         table.dateTime('dataLog')

         table.varchar('tipo', 30)
         table.varchar('token', 6)

         table.boolean('isLog').default(false)

         table.text('descricao')

         table.timestamps()
      })
   }

   down() {
      this.drop('sign_logs')
   }
}

module.exports = SignLogSchema
