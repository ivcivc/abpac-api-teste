'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LancamentoStatusSchema extends Schema {
   up() {
      this.create('lancamento_statuses', table => {
         table.increments()

         table.varchar('motivo', 250)

         table
            .enu(
               'status',
               [
                  'Aberto',
                  'Acordado',
                  'Inadimplente',
                  'Cancelado',
                  'Compensado',
                  'Bloqueado',
               ],
               {
                  useNative: true,
                  existingType: true,
                  enumName: 'lanc_status',
               }
            )
            .notNullable()
            .defaultTo('Aberto')

         table
            .integer('lancamento_id')
            .unsigned()
            .references('id')
            .inTable('lancamentos')
            .onUpdate('CASCADE')
            .onDelete('CASCADE')

         table.integer('user_id').notNullable()
         table.timestamps()
      })
   }

   down() {
      this.drop('lancamento_statuses')
   }
}

module.exports = LancamentoStatusSchema
