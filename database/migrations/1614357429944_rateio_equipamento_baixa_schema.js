'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RateioEquipamentoBaixaSchema extends Schema {
   up() {
      this.create('rateio_equipamento_baixas', table => {
         table.increments()

         table
            .integer('rateio_id')
            .unsigned()
            .references('id')
            .inTable('rateios')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(null)

         table
            .integer('equipamento_id')
            .unsigned()
            .references('id')
            .inTable('equipamentos')
            .onUpdate('CASCADE')
            .onDelete('RESTRICT')
            .defaultTo(null)

         table
            .integer('pessoa_id')
            .unsigned()
            .references('id')
            .inTable('pessoas')

         table.string('pessoa_nome', 50).notNullable().index()
         table.decimal('pessoa_descontoEspecial', 6, 2).defaultTo(0)
         table.string('pessoa_parcela', 2)

         table.date('dAdesao').notNullable()

         table
            .integer('categoria_id')
            .unsigned()
            .references('id')
            .inTable('categorias')

         table.varchar('categoria_abreviado', 5)
         table.varchar('categoria_nome', 150)

         //table.decimal('percentualEspecial', 6, 2).defaultTo(0.0)

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

         table.decimal('valorBeneficios', 10, 2).defaultTo(0.0)
         table.decimal('valorBeneficiosBase', 10, 2).defaultTo(0.0)
         table.decimal('valorRateio', 10, 2).defaultTo(0.0)
         table.decimal('valorTaxaAdm', 10, 2).defaultTo(0.0)
         table.decimal('valorTaxaAdmBase', 10, 2).defaultTo(0.0)
         table.decimal('valorTotal', 10, 2).defaultTo(0.0)

         table
            .enu('baixa', ['Não', 'Sim'], {
               useNative: true,
               existingType: true,
               enumName: 'equipa_baixa',
            })
            .notNullable()
            .defaultTo('Não')
            .index()

         table.date('dEndosso').defaultTo(null)

         table.timestamps()
      })
   }

   down() {
      this.drop('rateio_equipamento_baixas')
   }
}

module.exports = RateioEquipamentoBaixaSchema
