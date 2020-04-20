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
const OcorrenciaTerceiroStatus = use('App/Models/OcorrenciaTerceiroStatus')
const File = use('App/Models/File')
const FileItem = use('App/Models/FileItem')
const OcorrenciaStatus = use('App/Models/OcorrenciaStatus')
const BloqueadorLocalizador = use('App/Models/BloqueadorLocalizador')
const EquipamentoProtecao = use('App/Models/EquipamentoProtecao')
const EquipamentoProtecaoStatus = use('App/Models/EquipamentoProtecaoStatus')
const Beneficio = use('App/Models/Beneficio')
const EquipamentoBeneficio = use('App/Models/EquipamentoBeneficio')
const EquipamentoBeneficioStatus = use('App/Models/EquipamentoBeneficioStatus')
const PendenciaSetup = use('App/Models/PendenciaSetup')
const Pendencia = use('App/Models/Pendencia')

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
  File,
  FileItem,
  BloqueadorLocalizador,
  EquipamentoProtecao,
  EquipamentoProtecaoStatus,
  Beneficio,
  EquipamentoBeneficio,
  EquipamentoBeneficioStatus,
  PendenciaSetup,
  Pendencia,
   OcorrenciaTerceiroStatus
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
