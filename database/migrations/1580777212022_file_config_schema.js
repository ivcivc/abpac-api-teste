'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FileConfigSchema extends Schema {
  up () {
    this.create('file_configs', (table) => {
      table.increments()

      table.string('descricao')

       table.string('modulo').notNullable().index()


      table.timestamps()
    })
  }

  down () {
    this.drop('file_configs')
  }
}

module.exports = FileConfigSchema
