'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BoletoSchema extends Schema {
   up() {
      this.create('boletos', table => {
         table.increments()

         table.date('dVencimento').defaultTo(null).index()
         table.date('dCompensacao').defaultTo(null).index()
         table.varchar('nrRetorno').defaultTo(null)

         table.integer('nossoNumero').index()

         table.varchar('boleto_nota1', 80).default('')
         table.varchar('boleto_nota2', 80).default('')

         table
            .integer('conta_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('contas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('lancamento_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('lancamentos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table
            .integer('pessoa_id')
            .unsigned()
            .references('id')
            .inTable('pessoas')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')

         table.float('valorTotal', 10, 2).defaultTo(0.0)

         table
            .enu('status', ['Aberto', 'Compensado', 'Bloqueado', 'Cancelado'], {
               useNative: true,
               existingType: true,
               enumName: 'boleto_status',
            })
            .notNullable()
            .defaultTo('Bloqueado')
            .index()

         table.timestamps()
      })
   }

   down() {
      this.drop('boletos')
   }
}

module.exports = BoletoSchema
