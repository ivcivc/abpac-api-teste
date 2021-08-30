'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SignSchema extends Schema {
   up() {
      this.create('signs', table => {
         table.increments()

         table.varchar('arquivo', 30)
         table.varchar('doc_id', 128)
         table.varchar('hash', 128)

         table.dateTime('validate')

         table.varchar('signatarioNome', 100)
         table.varchar('signatarioCpf', 14)
         table.date('signatarioDNasc')
         table.text('signatarioEmail')

         table.varchar('tipo', 30)
         table.varchar('token', 6)

         table.date('dataDoc')
         table.varchar('assinatura', 30)

         table.integer('user_id').notNullable()

         table.varchar('status', 30).index()

         table.timestamps()
      })
   }

   down() {
      this.drop('signs')
   }
}

module.exports = SignSchema
