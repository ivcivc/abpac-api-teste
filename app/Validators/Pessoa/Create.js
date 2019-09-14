'use strict'
const mensagens = require('../messages')

class PessoaCreate {

   get validateAll() {
      return true
     }

   get rules () {
      return {
         nome: 'required|string|min:3|max:50',
         cpfCnpj: 'required|string|cpfCnpjValidate|uniqueCompound:pessoas,cpfCnpj/tipo',
         responsavel: 'string|max:50',
         apelido: 'string|max:20',
         tipoPessoa: 'string',
         dNasc: 'date',
         email: 'email',
         tipo: 'string'
      }
    }

    get messages () {

      const regras = {
         'cpfCnpj.uniqueCompound' : 'CPF/CNPJ em duplicidade'

      }

       return Object.assign({}, mensagens,regras )

   }
}

module.exports = PessoaCreate
