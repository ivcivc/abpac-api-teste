'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioEquipamentoBeneficioSchema extends Schema {
   up() {
      this.create('rateio_equipamento_beneficios', table => {
         table.increments()

         table
            .integer('rateio_equipamento_id')
            .unsigned()
            .references('id')
            .inTable('rateio_equipamentos')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')
            .defaultTo(null)

         table.string('beneficio', 45).notNullable().index()
         table.string('modelo', 30).notNullable().index()
         table.float('valor', 10, 2).defaultTo(0.0)

         table.timestamps()
      })
   }

   down() {
      this.drop('rateio_equipamento_beneficios')
   }
}

module.exports = RateioEquipamentoBeneficioSchema
