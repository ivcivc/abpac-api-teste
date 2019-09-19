'use strict'

const lucidql = require('@srtech/lucidql')

const Pessoa = use('App/Models/Pessoa')
const PessoaStatus = use('App/Models/PessoaStatus')
const User = use('App/Models/User')
const Categoria = use('App/Models/Categoria')

const classes = {
  __proto__: null,
  Pessoa,
  PessoaStatus,
  User,
  Categoria
}

class LucidQlController {
  async query({ request }) {
    let { baseTable, query } = request.all()

      console.log(query)
      console.log('-------------------------------------------------------------')



    return lucidql.run(classes[baseTable], query)
  }
}

module.exports = LucidQlController
