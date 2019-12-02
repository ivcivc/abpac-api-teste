'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PendenciaSchema extends Schema {
  up () {
    this.create('pendencias', (table) => {
      table.increments()

      table.varchar("modulo").notNullable()

      table.integer('pendencia_setup_id')
         .unsigned()
         .references('id')
         .inTable('pendencia_setups')
         .onUpdate('CASCADE')
         .onDelete('RESTRICT')
         .notNullable()

      table.integer('equipamento_id')
         .unsigned()
         .references('id')
         .inTable('equipamentos')
         .onUpdate('CASCADE')
         .onDelete('RESTRICT')

      table.integer('pessoa_id')
         .unsigned()
         .references('id')
         .inTable('pessoas')
         .onUpdate('CASCADE')
         .onDelete('RESTRICT')

      table
         .enu("status", ["Iniciado", "Em andamento", "Concluído", "Cancelado"], {
           useNative: true,
           existingType: true,
           enumName: "enu_status"
         })
         .notNullable()
         .defaultTo("Iniciado").index();

      table
         .enu("disparado", ["Sim", "Não", "Enviado"], {
           useNative: true,
           existingType: true,
           enumName: "enu_disparado"
         })
         .notNullable()
         .defaultTo("Não")


      table.timestamps()

  })

}

  down () {
    this.drop('pendencias')
  }
}

module.exports = PendenciaSchema
