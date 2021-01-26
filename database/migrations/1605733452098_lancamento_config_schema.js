'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LancamentoConfigSchema extends Schema {
   up() {
      this.create('lancamento_configs', table => {
         table.increments()

         table
            .integer('pagar_plano_id_acresc')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('pagar_plano_id_desc')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('receber_plano_id_acresc')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
         table
            .integer('receber_plano_id_desc')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('receber_plano_id_prej')
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
            .integer('receber_plano_id_acordo')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('receber_plano_id_acordo_compensado')
            .unsigned()
            .references('id')
            .inTable('plano_de_contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table.timestamps()
      })
   }

   down() {
      this.drop('lancamento_configs')
   }
}

module.exports = LancamentoConfigSchema
