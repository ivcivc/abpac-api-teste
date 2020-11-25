'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OrdemServicoStatusSchema extends Schema {
   up() {
      this.create('ordem_servico_statuses', table => {
         table.increments()

         table.varchar('motivo', 250)

         table
            .enu(
               'status',
               ['Em espera', 'Em execução', 'Finalizado', 'Cancelado'],
               {
                  useNative: true,
                  existingType: true,
                  enumName: 'os_status',
               }
            )
            .notNullable()
            .defaultTo('Em espera')

         table
            .integer('ordem_servico_id')
            .unsigned()
            .references('id')
            .inTable('ordem_servicos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table.integer('user_id').notNullable()

         table.timestamps()
      })
   }

   down() {
      this.drop('ordem_servico_statuses')
   }
}

module.exports = OrdemServicoStatusSchema
