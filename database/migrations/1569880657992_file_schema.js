'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FileSchema extends Schema {
  up () {
    this.create('files', (table) => {
      table.increments()

      table.string('descricao')

      table.enu("status", ["Pendente", "Concluído", "Cancelado", "Vencido", "Renovado"], {
         useNative: true,
         existingType: true,
         enumName: "file_status"
       }).notNullable()
       .defaultTo("Concluído").index();

       table.string('modulo').notNullable().index()
       table.integer('idParent').index()
       table.integer('pessoa_id').index()

       table.date('dVencimento').defaultTo(null)

      table.timestamps()
    })
  }

  down () {
    this.drop('files')
  }
}

module.exports = FileSchema
