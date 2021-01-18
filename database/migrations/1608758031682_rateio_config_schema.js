'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioConfigSchema extends Schema {
   up() {
      this.create('rateio_configs', table => {
         table.increments()

         table
            .integer('conta_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(0)

         table.varchar('boleto_nota1', 80).default('')
         table.varchar('boleto_nota2', 80).default('')

         table
            .integer('beneficios_plano_id')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('rateio_plano_id')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('receber_plano_id_cInad')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('receber_plano_id_dInad')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('txAdm_plano_id')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table.timestamps()
      })
   }

   down() {
      this.drop('rateio_configs')
   }
}

module.exports = RateioConfigSchema
