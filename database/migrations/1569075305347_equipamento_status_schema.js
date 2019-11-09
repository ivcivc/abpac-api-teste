'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoStatusSchema extends Schema {
  up () {
    this.create('equipamento_statuses', (table) => {

      table.varchar("motivo", 250);

      table
        .enu("status", ["Ativo", "Endossado", "Inativo"], {
          useNative: true,
          existingType: true,
          enumName: "equipamento_status"
        })
        .notNullable()
        .defaultTo("Ativo");

      table
        .integer('equipamento_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('equipamentos')
        .onUpdate('CASCADE')
        .onDelete('RESTRICT')

      table.integer('user_id').notNullable()

      table.increments()
      table.timestamps()
    })
  }

  down () {
    this.drop('equipamento_statuses')
  }
}

module.exports = EquipamentoStatusSchema
