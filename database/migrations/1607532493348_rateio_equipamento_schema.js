'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioEquipamentoSchema extends Schema {
   up() {
      this.create('rateio_equipamentos', table => {
         table.increments()

         table
            .integer('rateio_id')
            .unsigned()
            .references('id')
            .inTable('rateios')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(0)

         table
            .integer('equipamento_id')
            .unsigned()
            .references('id')
            .inTable('equipamentos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(0)

         table
            .integer('pessoa_id')
            .unsigned()
            .references('id')
            .inTable('pessoas')

         table.string('pessoa_nome', 50).notNullable().index()
         table.float('pessoa_descontoEspecial', 6, 2).defaultTo(0)
         table.string('pessoa_parcela', 2)

         table.date('dAdesao').notNullable()

         table
            .integer('categoria_id')
            .unsigned()
            .references('id')
            .inTable('categorias')

         table.varchar('categoria_abreviado', 5)

         table.enu('especie', ['Rebocador', 'Semi-Reboque', 'Caminhão'], {
            useNative: true,
            existingType: true,
            enumName: 'rateio_equipamento_especie',
         })

         table.varchar('marca', 20)
         table.varchar('modelo', 40)
         table.varchar('chassi', 20)
         table.varchar('placa', 8)
         table.varchar('anoF', 4)
         table.varchar('modeloF', 4)

         table.float('valorBeneficios', 10, 2).defaultTo(0.0)
         table.float('valorBeneficiosBase', 10, 2).defaultTo(0.0)
         table.float('valorRateio', 10, 2).defaultTo(0.0)
         table.float('valorTaxaAdm', 10, 2).defaultTo(0.0)
         table.float('valorTaxaAdmBase', 10, 2).defaultTo(0.0)
         table.float('valorTotal', 10, 2).defaultTo(0.0)

         table.timestamps()
      })
   }

   down() {
      this.drop('rateio_equipamentos')
   }
}

module.exports = RateioEquipamentoSchema
