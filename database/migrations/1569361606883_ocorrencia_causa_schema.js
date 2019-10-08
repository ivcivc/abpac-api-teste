'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OcorrenciaCausaSchema extends Schema {
  up () {
    this.create('ocorrencia_causas', (table) => {

      table.varchar("nome", 40).notNullable().unique()

      table.increments()
      table.timestamps()
    })
  }

  down () {
    this.drop('ocorrencia_causas')
  }
}

module.exports = OcorrenciaCausaSchema
