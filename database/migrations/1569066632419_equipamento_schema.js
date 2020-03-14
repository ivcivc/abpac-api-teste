'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EquipamentoSchema extends Schema {
  up () {
    this.create('equipamentos', (table) => {

      table.integer("pessoa_id").unsigned().references('id').inTable('pessoas')

      table.integer("idPrincipal").defaultTo(0).index()
      table.integer("idPai").defaultTo(0).index()
      table.integer("idFilho").defaultTo(0).index()

      table.varchar("tipoEndosso", 40)

      table.date("dAdesao").notNullable()
      table
        .enu("status", ["Ativo","Endossado", "Inativo"], {
          useNative: true,
          existingType: true,
          enumName: "equipamento_status"
        })
        .notNullable()
        .defaultTo("Ativo").index();

      table.integer("categoria_id").unsigned().references('id').inTable('categorias')

      table
      .enu("especie1", ["Rebocador", "Semi-Reboque", "Caminhão"], {
        useNative: true,
        existingType: true,
        enumName: "equipamento_especie1"
      })
      table.varchar("marca1", 20)
      table.varchar("modelo1",40)
      table.varchar("chassi1",20)
      table.varchar("placa1",8)
      table.varchar("anoF1",4)
      table.varchar("modeloF1",4)
      table.varchar("renavam1",12)
      table.float("valorMercado1", 10,2)

      table
      .enu("especie2", ["Semi-Reboque"], {
        useNative: true,
        existingType: true,
        enumName: "equipamento_especie2"
      })
      table.varchar("marca2", 20)
      table.varchar("modelo2",40)
      table.varchar("chassi2",20)
      table.varchar("placa2",8)
      table.varchar("anoF2",4)
      table.varchar("modeloF2",4)
      table.varchar("renavam2",12)

      table
      .enu("especie3", ["Semi-Reboque"], {
        useNative: true,
        existingType: true,
        enumName: "equipamento_especie3"
      })
      table.varchar("marca3", 20)
      table.varchar("modelo3",40)
      table.varchar("chassi3",20)
      table.varchar("placa3",8)
      table.varchar("anoF3",4)
      table.varchar("modeloF3",4)
      table.varchar("renavam3",12)

      table.varchar("placas",26).index()


      table.increments()
      table.timestamps()
    })
  }

  down () {
    this.drop('equipamentos')
  }
}

module.exports = EquipamentoSchema
