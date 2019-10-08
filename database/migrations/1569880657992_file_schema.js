'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FileSchema extends Schema {
  up () {
    this.create('files', (table) => {
      table.increments()

      table.string('descricao')
      table.string('file').notNullable()
      table.string('name').notNullable()
      table.string('path').notNullable()
      table.string('fileId').notNullable()
      table.string('type', 20)
      table.string('subtype', 255)

      table.enu("status", ["Ativo", "Vencido", "Cancelado", "Recuperado"], {
         useNative: true,
         existingType: true,
         enumName: "file_status"
       }).notNullable()
       .defaultTo("Ativo");

       table.string('modulo').notNullable().index()
       table.string('grupo').index()
       table.integer('idParent').index()

       table.date('dVencimento').defaultTo(null)

      table.timestamps()
    })
  }

  down () {
    this.drop('files')
  }
}

module.exports = FileSchema
