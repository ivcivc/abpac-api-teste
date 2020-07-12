"use strict";

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use("Schema");

class PessoaSchema extends Schema {
  up() {
    this.create("pessoas", table => {

       table.increments();

      table.string("nome", 50).notNullable().index();
      table.string("responsavel", 50)
      table.string("indicacao", 20)

      table.enu("sexo", ["Masculino", "Feminino", null], {
         useNative: true,
         existingType: true,
         enumName: "pessoa_sexo"
       })

      table.date('dNasc')

      table.enu("tipoPessoa", ["Física", "Jurídica"], {
         useNative: true,
         existingType: true,
         enumName: "pessoa_tipo_pessoa"
       })

      table
        .string("cpfCnpj", 14)
        .notNullable()

      table.string("rg", 16);

      table.string("telFixo", 15);
      table.string("telFixoContato", 20);
      table.string("telSms", 50);
      table.string("telSmsContato", 20);
      table.string("telCelular", 15);
      table.string("telCelularContato", 20);

      table.text("email");

      table.text("nota");

      table
        .enu("status", ["Ativo", "Inativo", "Bloqueado"], {
          useNative: true,
          existingType: true,
          enumName: "pessoa_status"
        })
        .notNullable()
        .defaultTo("ativo").index();

      table.string("endRua", 70)
      table.string("endComplemento", 25)
      table.string("endBairro", 30)
      table.string("endCidade", 30)
      table.string("endEstado", 2)
      table.string("endCep", 8)

      table.string("parcela", 2)

      table
        .enu("tipo", ["associado", "fornecedor"], {
          useNative: true,
          existingType: true,
          enumName: "pessoa_tipo_status"
        })
        .notNullable()
        .defaultTo("associado").index();

        table.unique(['cpfCnpj', 'tipo'])

        table.integer('user')


      table.timestamps();
    });
  }

  down() {
    this.drop("pessoas");
  }
}

module.exports = PessoaSchema;
