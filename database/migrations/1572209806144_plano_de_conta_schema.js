'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PlanoDeContaSchema extends Schema {
  up () {
    this.create('plano_de_contas', (table) => {
      table.increments()

      table.varchar("descricao", 45)

      table.integer("idParent").defaultTo(0)

      table
      .enu("status", ["Ativo", "Inativo"], {
        useNative: true,
        existingType: true,
        enumName: "plano_conta_status"
      })
      .notNullable()
      .defaultTo("Ativo").index();

      table
      .enu("tipo", ["Receita", "Despesa"], {
        useNative: true,
        existingType: true,
        enumName: "plano_conta_tipo"
      })
      .notNullable().index();

      table.unique(['descricao', 'tipo'])

      table.timestamps()
    })
  }

  down () {
    this.drop('plano_de_contas')
  }
}

module.exports = PlanoDeContaSchema
