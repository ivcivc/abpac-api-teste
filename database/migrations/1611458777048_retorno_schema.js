'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RetornoSchema extends Schema {
   up() {
      this.create('retornos', table => {
         table.increments()

         table.integer('lancamento_id').defaultTo(null).index()
         table.varchar('sacado', 50)
         table.varchar('cpfCnpj', 20)
         table.datetime('dVencimento').defaultTo(null)
         table.datetime('dOcorrencia').defaultTo(null)
         table.datetime('dCredito').defaultTo(null).index()
         table.datetime('dProcessamento').defaultTo(null)
         table.datetime('dMoraJuros').defaultTo(null).index()

         table.varchar('nossoNumero', 15).index()

         table.float('valorAbatimento', 10, 2).defaultTo(0.0)
         table.float('valorDesconto', 10, 2).defaultTo(0.0)
         table.float('valorMoraJuros', 10, 2).defaultTo(0.0)
         table.float('valorIOF', 10, 2).defaultTo(0.0)
         table.float('valorOutrasDespesas', 10, 2).defaultTo(0.0)
         table.float('valorOutrosCreditos', 10, 2).defaultTo(0.0)
         table.float('valorRecebido', 10, 2).defaultTo(0.0)

         table.varchar('codTipoOcorrencia', 40).index()
         table.varchar('descricaoTipoOcorrencia', 40).index()
         table.varchar('motivoRejeicao1', 60).index()

         table.varchar('banco', 4)
         table.varchar('conta', 12)
         table.varchar('contaDigito', 1)
         table.varchar('agencia', 4)
         table.varchar('agenciaDigito', 1)
         table.varchar('cedente', 15)

         table.varchar('grupo_id', 20)

         table.varchar('situacao', 30)

         table.timestamps()
      })
   }

   down() {
      this.drop('retornos')
   }
}

module.exports = RetornoSchema
