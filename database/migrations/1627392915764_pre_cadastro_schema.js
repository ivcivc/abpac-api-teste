'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PreCadastroSchema extends Schema {
   up() {
      this.create('pre_cadastros', table => {
         table.increments()

         table
            .integer('pessoa_id')
            .unsigned()
            .references('id')
            .inTable('pessoas')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')
            .defaultTo(null)

         table.text('nota')
         table.date('dAutorizacao').defaultTo(null)

         table.string('status', 60).index().notNullable()

         table.timestamps()
      })
   }

   down() {
      this.drop('pre_cadastros')
   }
}

module.exports = PreCadastroSchema
