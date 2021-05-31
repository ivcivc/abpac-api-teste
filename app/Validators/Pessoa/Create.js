'use strict'
const mensagens = require('../messages')

class PessoaCreate {

   get validateAll() {
      return true
     }

   get rules () {
      return {
         nome: 'required|string|min:3|max:50',
         cpfCnpj: 'string|cpfCnpjValidate|uniqueCompound:pessoas,cpfCnpj/tipo',
         responsavel: 'string|max:50',
         tipoPessoa: 'string',
         dNasc: 'date',
         email: 'string',
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
