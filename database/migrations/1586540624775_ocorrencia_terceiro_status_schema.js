'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OcorrenciaTerceiroStatusSchema extends Schema {
  up () {
    this.create('ocorrencia_terceiro_statuses', (table) => {
      table.increments()

       table.varchar("motivo", 250);

       table
          .enu("status", ["Aberto", "Concluído", "Recusado", "Cancelado"], {
             useNative: true,
             existingType: true,
             enumName: "pessoa_status"
          })
          .notNullable()
          .defaultTo("Aberto");

       table
          .integer('ocorrencia_terceiro_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('ocorrencia_terceiros')
          .onUpdate('CASCADE')
          .onDelete('RESTRICT')

       table.integer('user_id').notNullable()

      table.timestamps()
    })
  }

  down () {
    this.drop('ocorrencia_terceiro_statuses')
  }
}

module.exports = OcorrenciaTerceiroStatusSchema
