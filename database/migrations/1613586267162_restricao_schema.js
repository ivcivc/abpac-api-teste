'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RestricaoSchema extends Schema {
   up() {
      this.create('restricaos', table => {
         table.increments()
         table.varchar('descricao', 45).unique()
         table.timestamps()
      })
   }

   down() {
      this.drop('restricaos')
   }
}

module.exports = RestricaoSchema
