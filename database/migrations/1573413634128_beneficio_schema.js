'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BeneficioSchema extends Schema {
   up() {
      this.create('beneficios', table => {
         table.increments()

         //table.varchar("abrev", 10).index().notNullable()
         table.varchar('descricao', 45).unique()

         table
            .enu('rateio', ['Sim', 'Não'], {
               useNative: true,
               existingType: true,
               enumName: 'beneficio_enu',
            })
            .notNullable()
            .defaultTo('Sim')

         table
            .enu('modelo', ['Assistencia 24h', 'Terceiro', 'Outros'], {
               useNative: true,
               existingType: true,
               enumName: 'modelo_enu',
            })
            .notNullable()
            .defaultTo('Assistencia 24h')

         table
            .enu('status', ['Ativo', 'Inativo'], {
               useNative: true,
               existingType: true,
               enumName: 'beneficio_status_enu',
            })
            .notNullable()
            .defaultTo('Ativo')

         //table.unique(['abrev','status']);

         table.float('valor').defaultTo(0.0)

         table.timestamps()
      })
   }

   down() {
      this.drop('beneficios')
   }
}

module.exports = BeneficioSchema
