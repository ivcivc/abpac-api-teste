'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class TesteSchema extends Schema {
  up () {
    this.create('testes', (table) => {
      table.increments()

      table.varchar("status", 10);
      table.varchar("nome", 55).index()

      table.unique(['nome','status']);


      table.timestamps()
    })
  }

  down () {
    this.drop('testes')
  }
}

module.exports = TesteSchema
