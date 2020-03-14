'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoBeneficioSchema extends Schema {
  up () {
    this.create('equipamento_beneficios', (table) => {
      table.increments()

      table.date("dInicio").notNullable()
      table.date("dTermino")

      table
         .integer('equipamento_id')
         .unsigned()
         .references('id')
         .inTable('equipamentos')
         .onUpdate('CASCADE')
         .onDelete('RESTRICT')

      table
         .integer('beneficio_id')
         .unsigned()
         .references('id')
         .inTable('beneficios')
         .onUpdate('CASCADE')
         .onDelete('RESTRICT')

      table
      .enu("status", ["Ativo", "Inativo"], {
        useNative: true,
        existingType: true,
        enumName: "eq_beneficio_status_enu"
      }).notNullable()
      .defaultTo("Ativo");

      table.unique(['equipamento_id', 'beneficio_id', 'status'])

      table.text("obs")

      table.timestamps()
    })
  }

  down () {
    this.drop('equipamento_beneficios')
  }
}

module.exports = EquipamentoBeneficioSchema
