'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OcorrenciaSchema extends Schema {
   up() {
      this.create('ocorrencias', table => {
         table.increments()

         table.integer('marcado').defaultTo(null)

         table.integer('pessoa_id').notNullable()
         table
            .enu(
               'status',
               ['Aberto', 'Complemento', 'Concluído', 'Cancelado'],
               {
                  useNative: true,
                  existingType: true,
                  enumName: 'ocorrencia_status',
               }
            )
            .notNullable()
            .defaultTo('Aberto')
            .index()

         table
            .integer('equipamento_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('equipamentos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table.enu(
            'tipoAcidente',
            [
               'Não informado',
               'Acidente',
               'Roubo',
               'Roubo recuperado',
               'Perda Total',
            ],
            {
               useNative: true,
               existingType: true,
               enumName: 'ocorrencia_tipo',
            }
         )

         table.date('dEvento')
         table.varchar('hora', 5)
         table.varchar('local', 40)
         table.varchar('cidade', 20)
         table.varchar('uf', 2)
         table.varchar('bo', 20)
         table.varchar('boLavrado', 15)

         table.varchar('vitimaFatal', 4).defaultTo('Não')
         table.varchar('assist24h', 4).defaultTo('Não')

         table.varchar('responsavel', 10)

         table.decimal('qualPlaca', 1, 0).defaultTo(1)

         table
            .integer('ocorrencia_causa_id')
            .unsigned()
            .references('id')
            .inTable('ocorrencia_causas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table.varchar('equipaCarregado', 4).defaultTo('Não')
         table.varchar('equipaCarregadoNota', 30)
         table.enu(
            'quemAcidentou',
            ['Motorista', 'Proprietário', 'Não informado'],
            {
               useNative: true,
               existingType: true,
               enumName: 'ocorrencia_quemAcidentou',
            }
         )

         table.date('dPatioEntrada')
         table.date('dOficinaEntrada')
         table.varchar('oficinaEntrada', 30)

         table.date('dPrevisaoEntrega')
         table.date('dProprietarioEntrega')
         table.varchar('obsEntrega', 30)

         table.text('descricao')
         table.text('nota', 25)

         table.integer('rateio_id')

         table.timestamps()
      })
   }

   down() {
      this.drop('ocorrencias')
   }
}

module.exports = OcorrenciaSchema
