'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OcorrenciaTerceiroSchema extends Schema {
  up () {
    this.create('ocorrencia_terceiros', (table) => {
      table.increments()

      table.varchar("nome", 40)
     table
          .string("cpfCnpj", 14)
          .notNullable()

      table.varchar("equipamento", 60)
      table.varchar("placa", 8)
      table.varchar("fabricacao", 9)
      table.varchar("anoF",4)
      table.varchar("modeloF",4)
      table.varchar("chassi",20)
      table.varchar("temSeguro", 4).defaultTo("Não")
      table.varchar("passivelRessarcimento", 4).defaultTo("Não")

      table.varchar("seguradora", 20)
      table.varchar("apolice", 20)

      table.string("tel", 15);
      table.string("telContato", 20);
      table.string("celular", 50);
      table.string("celularContato", 20);
      table.text("email")

      table
         .integer('ocorrencia_id')
         .unsigned()
         .references('id')
         .inTable('ocorrencias')
         .onUpdate('CASCADE')
         .onDelete('RESTRICT')

      table
         .enu("atender", ["Sim", "Não"], {
           useNative: true,
           existingType: true,
           enumName: "enu_atender"
         })
         .notNullable()
         .defaultTo("Não").index();

      table.text("obs")

       table.integer('user')

       table.enu("status", ["Aberto", "Concluído", "Recusado", "Cancelado"], {
          useNative: true,
          existingType: true,
          enumName: "terceiro_status"
       }).defaultTo("Aberto");

      table.timestamps()
    })
  }

  down () {
    this.drop('ocorrencia_terceiros')
  }
}

module.exports = OcorrenciaTerceiroSchema
