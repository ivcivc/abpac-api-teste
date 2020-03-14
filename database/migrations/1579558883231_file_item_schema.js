'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FileItemSchema extends Schema {
  up () {
    this.create('file_items', (table) => {
      table.increments()

      table
      .integer('file_id').index()
      .unsigned()
      .references('id')
      .inTable('files')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')

      table.string('key').notNullable()
      table.string('file').notNullable()
      table.string('name').notNullable()
      table.string('path').notNullable()
      table.string('type', 20)
      table.string('subtype', 255)

      table.enu("status", ["Aprovado", "Reprovado", "Cancelado", "Em Análise"], {
         useNative: true,
         existingType: true,
         enumName: "file_status"
       }).notNullable()
       .defaultTo("Aprovado");


      table.timestamps()
    })
  }

  down () {
    this.drop('file_items')
  }
}

module.exports = FileItemSchema
