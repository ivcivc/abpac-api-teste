'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BeneficioSchema extends Schema {
  up () {
    this.create('beneficios', (table) => {
      table.increments()

      table.varchar("descricao", 45).unique()

      table
      .enu("rateio", ["Sim", "Não"], {
        useNative: true,
        existingType: true,
        enumName: "beneficio_enu"
      }).notNullable()
      .defaultTo("Sim");

      table
      .enu("status", ["Ativo", "Inativo"], {
        useNative: true,
        existingType: true,
        enumName: "beneficio_status_enu"
      }).notNullable()
      .defaultTo("Ativo");


      table.float("valor").defaultTo(0.00)

      table.timestamps()
    })
  }

  down () {
    this.drop('beneficios')
  }
}

module.exports = BeneficioSchema
