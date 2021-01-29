'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoProtecaoSchema extends Schema {
   up() {
      this.create('equipamento_protecaos', table => {
         table.increments()

         table.date('dAtivacao')
         table.date('dRemocao')

         table.varchar('dono', 10)

         table
            .integer('bloqueador_localizador_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('bloqueador_localizadors')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table.varchar('nrSerie', 25)
         table.varchar('local', 40)

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
            .integer('equipamento_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('equipamentos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .enu('tipo', ['Localizador', 'Bloqueador'], {
               useNative: true,
               existingType: true,
               enumName: 'equipamento_tipo_status',
            })
            .notNullable()
            .defaultTo('Localizador')

         table.integer('user_id').notNullable()

         table.text('obs')

         table.timestamps()
      })
   }

   down() {
      this.drop('equipamento_protecaos')
   }
}

module.exports = EquipamentoProtecaoSchema
