'use strict'

const lucidql = require('@srtech/lucidql')

const Pessoa = use('App/Models/Pessoa')
const User = use('App/Models/User')

const classes = {
  __proto__: null,
  Pessoa,
  User
}

class LucidQlController {
  async query({ request }) {
    let { baseTable, query } = request.all()

      console.log(query)



    return lucidql.run(classes[baseTable], query)
  }
}

module.exports = LucidQlController
