'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OcorrenciaStatusSchema extends Schema {
  up () {
    this.create('ocorrencia_statuses', (table) => {
      table.increments()

      table.varchar("motivo", 250);

      table
        .enu("status", ["Aberto", "Complemento", "Concluído"], {
          useNative: true,
          existingType: true,
          enumName: "ocorrencia_status"
        })
        .notNullable()
        .defaultTo("Aberto");

      table
        .integer('ocorrencia_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('ocorrencias')
        .onUpdate('CASCADE')
        .onDelete('RESTRICT')

      table.integer('user_id').notNullable()

      table.timestamps()
    })
  }

  down () {
    this.drop('ocorrencia_statuses')
  }
}

module.exports = OcorrenciaStatusSchema
