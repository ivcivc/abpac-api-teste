'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OcorrenciaTerceiroSchema extends Schema {
  up () {
    this.create('ocorrencia_terceiros', (table) => {

      table.varchar("nome", 40)
      table.varchar("veiculo", 50)
      table.varchar("placa", 8)
      table.varchar("fabricacao", 9)

      table.varchar("temSeguro", 4).defaultTo("Não")
      table.varchar("passivelRessarcimento", 4).defaultTo("Não")

      table.varchar("seguradora", 20)
      table.varchar("apolice", 20)

      table.string("tel", 15);
      table.text("email")

      table
         .integer('ocorrencia_id')
         .unsigned()
         .references('id')
         .inTable('ocorrencias')
         .onUpdate('CASCADE')
         .onDelete('RESTRICT')

      table.text("obs")

      table.increments()
      table.timestamps()
    })
  }

  down () {
    this.drop('ocorrencia_terceiros')
  }
}

module.exports = OcorrenciaTerceiroSchema
