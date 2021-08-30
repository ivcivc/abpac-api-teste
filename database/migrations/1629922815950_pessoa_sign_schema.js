'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PessoaSignSchema extends Schema {
   up() {
      this.create('pessoa_signs', table => {
         table.increments()

         table
            .integer('pessoa_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('pessoas')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')

         table
            .integer('sign_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('signs')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')

         table.integer('preCadastro_id', 15).notNullable().index()

         table.timestamps()
      })
   }

   down() {
      this.drop('pessoa_signs')
   }
}

module.exports = PessoaSignSchema
