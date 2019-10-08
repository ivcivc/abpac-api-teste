'use strict'

const lucidql = require('@srtech/lucidql')

const Pessoa = use('App/Models/Pessoa')
const PessoaStatus = use('App/Models/PessoaStatus')
const User = use('App/Models/User')
const Categoria = use('App/Models/Categoria')
const Equipamento = use('App/Models/Equipamento')
const EquipamentoStatus = use('App/Models/EquipamentoStatus')
const Ocorrencia = use('App/Models/Ocorrencia')
const OcorrenciaTerceiro = use('App/Models/OcorrenciaTerceiro')
const File = use('App/Models/File')
const OcorrenciaStatus = use('App/Models/OcorrenciaStatus')


const classes = {
  __proto__: null,
  Pessoa,
  PessoaStatus,
  User,
  Categoria,
  Equipamento,
  EquipamentoStatus,
  Ocorrencia,
  OcorrenciaTerceiro,
  OcorrenciaStatus,
  File
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
