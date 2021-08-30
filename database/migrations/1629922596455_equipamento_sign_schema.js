'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoSignSchema extends Schema {
   up() {
      this.create('equipamento_signs', table => {
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
            .integer('sign_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('signs')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')

         table.timestamps()
      })
   }

   down() {
      this.drop('equipamento_signs')
   }
}

module.exports = EquipamentoSignSchema
