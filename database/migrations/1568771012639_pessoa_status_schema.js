'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PessoaStatusSchema extends Schema {
  up () {
    this.create('pessoa_statuses', (table) => {

       table.increments()

      table.varchar("motivo", 250);

      table
        .enu("status", ["Ativo", "Inativo", "Bloqueado"], {
          useNative: true,
          existingType: true,
          enumName: "pessoa_status"
        })
        .notNullable()
        .defaultTo("Ativo");

      table
        .integer('pessoa_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('pessoas')
        .onUpdate('CASCADE')
        .onDelete('RESTRICT')

      table.integer('user_id').notNullable()



      table.timestamps()
    })
  }

  down () {
    this.drop('pessoa_statuses')
  }
}

module.exports = PessoaStatusSchema
