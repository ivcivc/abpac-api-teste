'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoRestricaoSchema extends Schema {
   up() {
      this.create('equipamento_restricaos', table => {
         table.increments()

         table
            .integer('equipamento_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('equipamentos')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')

         table
            .integer('restricao_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('restricaos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table.timestamps()
      })
   }

   down() {
      this.drop('equipamento_restricaos')
   }
}

module.exports = EquipamentoRestricaoSchema
