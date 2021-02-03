'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ContaSchema extends Schema {
   up() {
      this.create('contas', table => {
         table.increments()

         table
            .enu('tipo', ['banco', 'outro'], {
               useNative: true,
               existingType: true,
               enumName: 'conta_tipo',
            })
            .notNullable()
            .defaultTo('outro')

         table.varchar('nome', 25)
         table.varchar('documento', 14)

         table
            .enu('tipoConta', ['corrente', 'poupança'], {
               useNative: true,
               existingType: true,
               enumName: 'conta_tipoConta',
            })
            .defaultTo('corrente')

         table.varchar('banco', 3)
         table.varchar('agencia', 4)
         table.varchar('agenciaDV', 1)
         table.varchar('contaCorrente', 8)
         table.varchar('contaCorrenteDV', 1)

         table.date('dInicio').defaultTo(null)
         table.float('saldo', 14, 2).defaultTo(0.0)

         table.varchar('modeloBoleto', 20).defaultTo('-1')
         table.varchar('convenio', 10).defaultTo('')

         table
            .enu('disponivel', ['despesa', 'receita', 'ambos'], {
               useNative: true,
               existingType: true,
               enumName: 'conta_disponivel',
            })
            .notNullable()
            .defaultTo('ambos')

         table
            .enu('status', ['Ativo', 'Inativo'], {
               useNative: true,
               existingType: true,
               enumName: 'conta_status',
            })
            .notNullable()
            .defaultTo('Ativo')

         table.timestamps()
      })
   }

   down() {
      this.drop('contas')
   }
}

module.exports = ContaSchema
