'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RemessaSchema extends Schema {
   up() {
      this.create('remessas', table => {
         table.increments()

         table.varchar('file', 30).index()
         table.datetime('dFile').defaultTo(null).index()
         table.varchar('size', 20)

         table.boolean('isArquived').defaultTo(false)

         table.timestamps()
      })
   }

   down() {
      this.drop('remessas')
   }
}

module.exports = RemessaSchema
