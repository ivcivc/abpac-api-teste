'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoProtecaoStatusSchema extends Schema {
   up() {
      this.create('equipamento_protecao_statuses', table => {
         table.increments()

         table.varchar('motivo', 250)

         table
            .enu(
               'status',
               [
                  'Instalar',
                  'Revisar',
                  'Remover',
                  'Instalado',
                  'Revisado',
                  'Removido',
                  'Perdido',
                  'Cancelado',
               ],
               {
                  useNative: true,
                  existingType: true,
                  enumName: 'equipamento_protecao_status',
               }
            )
            .notNullable()
            .defaultTo('Instalar')

         table
            .integer('equipamento_protecao_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('equipamento_protecaos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table.integer('user_id').notNullable()

         table.timestamps()
      })
   }

   down() {
      this.drop('equipamento_protecao_statuses')
   }
}

module.exports = EquipamentoProtecaoStatusSchema
