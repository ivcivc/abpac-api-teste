'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FileNotificationSchema extends Schema {
  up () {
    this.create('file_notifications', (table) => {
      table.increments()

      table
      .integer('file_id').index()
      .unsigned()
      .references('id')
      .inTable('files')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')

      table.text('descricao').notNullable()

      table.timestamps()
    })
  }

  down () {
    this.drop('file_notifications')
  }
}

module.exports = FileNotificationSchema
