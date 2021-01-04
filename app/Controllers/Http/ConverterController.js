'use strict'
const Database = use('Database')

const EquipamentoServices = use('App/Services/Equipamento')
const PessoaServices = use('App/Services/Pessoa')
const PessoaModel = use('App/Models/Pessoa')
const CategoriaService = use('App/Services/Categoria')

const xmlToJson = require('xml2json')
const lodash = require('lodash')
//  
let arrPessoas = []

class ConverterController {
   async converter({ request, response, auth }) {
      const payload = request.all()
      //const equipamentos= payload.Equipamentos
      //const tamanho= equipamentos.length

      let isPessoas = payload.isPessoas
      let isEquipamentos = payload.isEquipamentos
      let isCategoria = payload.isCategoria
      let categorias = payload.categorias

      let trx = await Database.beginTransaction()

      try {
         if (isCategoria) {
            for (let c in categorias) {
               let o = categorias[c]
               delete o.tag
               delete o.created_at
               delete o.updated_at
               let categ = await new CategoriaService().add(o)
            }
         }

         // Conversão de Pessoas
         if (isPessoas) {
            for (let o in arrPessoas) {
               let reg = arrPessoas[o]
               let indicacao =
                  arrPessoas[o].indicacao.length > 20
                     ? arrPessoas[o].indicacao.substr(0, 20)
                     : arrPessoas[o].indicacao
               let obj = {
                  nome: arrPessoas[o].nome,
                  responsavel: arrPessoas[o].responsavel,
                  indicacao: indicacao,
                  sexo: arrPessoas[o].sexo,
                  dNasc: lodash.isEmpty(arrPessoas[o].dnasc)
                     ? null
                     : arrPessoas[o].dnasc,
                  tipoPessoa: arrPessoas[o].pessoa,
                  cpfCnpj: arrPessoas[o].cpf_cnpj,
                  rg: arrPessoas[o].rg,
                  telFixo: arrPessoas[o].tel,
                  telFixoContato: arrPessoas[o].tel_contato,
                  telCelular: arrPessoas[o].celular,
                  telCelularContato: arrPessoas[o].celular_contato,
                  telSms: arrPessoas[o].sms,
                  telSmsContato: arrPessoas[o].sms_contato,
                  email: arrPessoas[o].email,
                  nota:
                     arrPessoas[o].obs1 +
                     arrPessoas[o].obs2 +
                     arrPessoas[o].obs3,
                  status: arrPessoas[o].status,
                  endRua: arrPessoas[o].rua,
                  endComplemento: arrPessoas[o].compl,
                  endBairro: arrPessoas[o].bairro,
                  endCidade: arrPessoas[o].cidade,
                  endEstado: arrPessoas[o].estado,
                  endCep: arrPessoas[o].cep,
                  tipo: 'associado',
               }
               let pessoa = await new PessoaServices().add(obj, null, auth)
               arrPessoas[o].id = pessoa.id
            }
         } else {
            // bucar todas as pessoas e atribuir o id ao array arrPessoas
            let pessoas = await PessoaModel.all()

            for (let i in pessoas.rows) {
               let r = pessoas.rows[i]
               let busca = lodash.find(arrPessoas, { cpf_cnpj: r.cpfCnpj })
               if (busca) {
                  busca.id = r.id
               }
            }
         }

         let getCategoria = c => {
            let tag = c.substr(0, 2)
            let busca = lodash.find(categorias, { tag })
            if (busca) {
               return busca.id
            }
            return null
         }

         let getEspecie = c => {
            console.log('especie ', c)

            if (
               c.toUpperCase() === 'Cavalo_Mecânico_e_Rebocadores'.toUpperCase()
            ) {
               return 'Rebocador'
            }
            if (
               c.toUpperCase() === 'Cavalo_Mecânico_e_Rebocadores'.toUpperCase()
            ) {
               return 'Rebocador'
            }
            if (
               c.toUpperCase() === 'Cavalo_Mecânico_e_Rebocadores'.toUpperCase()
            ) {
               return 'Rebocador'
            }
            if (
               c.toUpperCase() ===
               'Veículos_Utilitários_e_Caminhões'.toUpperCase()
            ) {
               return 'Caminhão'
            }

            if (
               c.toUpperCase() ===
               'Veículos_Utilitários_e_Caminhões'.toUpperCase()
            ) {
               return 'Caminhão'
            }
            if (
               c.toUpperCase() ===
               'Veículos_Utilitários_e_Caminhões'.toUpperCase()
            ) {
               return 'Caminhão'
            }

            if (c.toUpperCase() === 'Semi_reboques_Carretas'.toUpperCase()) {
               return 'Semi-Reboque'
            }

            if (c.toUpperCase() === 'Semi_reboques_Carretas'.toUpperCase()) {
               return 'Semi-Reboque'
            }

            console.log('categoria nula......')

            return null
         }

         let getEspecieEXCLUIR = c => {
            console.log('especie ', c)
            if (c.toUpperCase() === 'REBOCADOR') {
               return 'Rebocador'
            }
            if (c.toUpperCase() === 'REBOCADOR1') {
               return 'Rebocador'
            }
            if (c.toUpperCase() === 'REBOCADOR 1') {
               return 'Rebocador'
            }
            if (c.toUpperCase() === 'CAMINHÃO') {
               return 'Caminhão'
            }

            if (c.toUpperCase() === 'CAMINHÃO2') {
               return 'Caminhão'
            }
            if (c.toUpperCase() === 'CAMINHÃO 2') {
               return 'Caminhão'
            }

            if (c.toUpperCase() === 'SEMI-REBOQUE') {
               return 'Semi-Reboque'
            }

            if (c.toUpperCase() === 'SEMI-REBOQUE2') {
               return 'Semi-Reboque'
            }

            if (c.toUpperCase() === 'REBOQUE') {
               return 'Semi-Reboque'
            }

            return null
         }

         let getPessoa = id => {
            let idcli = ''
            if (id.length < 10) {
               idcli = '0'.repeat(10 - id.length) + id
            }

            let busca = lodash.find(arrPessoas, { idcli })
            if (busca) {
               return busca.id
            }
            return null
         }

         let getValor = v => {
            v = v.replace('R$', '').replace(',', '') //.replace('.','.')
            return parseFloat(v)
         }

         // Conversão de Equipamentos
         let registro = null
         let arrEquipa = []

         if (isEquipamentos) {
            for (let o in arrEquipamentos) {
               let reg = arrEquipamentos[o]
               if (reg.ID === reg.PAI && reg.PARENT == '0') {
                  if (registro) {
                     arrEquipa.push(registro)
                     registro = null
                  }

                  let o = {
                     categoria_id: getCategoria(reg.SUBGRUPO),
                     pessoa_id: getPessoa(reg['CÓDIGO']),
                     especie1: getEspecie(reg.GRUPO),
                     marca1: reg.MARCA,
                     modelo1: reg.MODELO,
                     placa1: reg.PLACA,
                     chassi1: reg.CHASSI,
                     anoF1: reg['ANO/MODELO'].substr(0, 4),
                     modeloF1: reg['ANO/MODELO'].substr(5, 4),
                     valorMercado1: getValor(reg.VALOR),
                     dAdesao: reg['DATA ADESÃO'], //"1900-01-01"
                  }

                  registro = o
               } else {
                  if (reg.PARENT !== reg.PAI) {
                     throw (
                        'ID ' +
                        reg.ID +
                        ' O PAI devia ser igual ao ID (ORDEM 2 ou 3).'
                     )
                  }

                  if (reg.ORDEM === '2') {
                     registro.especie2 = getEspecie(reg.GRUPO)
                     registro.marca2 = reg.MARCA
                     registro.modelo2 = reg.MODELO
                     registro.placa2 = reg.PLACA
                     registro.chassi2 = reg.CHASSI
                     registro.anoF2 = reg['ANO/MODELO'].substr(0, 4)
                     registro.modeloF2 = reg['ANO/MODELO'].substr(5, 4)
                  }
                  if (reg.ORDEM === '3') {
                     registro.especie3 = getEspecie(reg.GRUPO)
                     registro.marca3 = reg.MARCA
                     registro.modelo3 = reg.MODELO
                     registro.placa3 = reg.PLACA
                     registro.chassi3 = reg.CHASSI
                     registro.anoF3 = reg['ANO/MODELO'].substr(0, 4)
                     registro.modeloF3 = reg['ANO/MODELO'].substr(5, 4)
                  }
               }

               console.log(reg.PLACA)
            }

            if (registro) {
               arrEquipa.push(registro)
               registro = null
            }

            for (let i in arrEquipa) {
               await new EquipamentoServices().add(arrEquipa[i], trx, auth)
            }
         }

         await trx.commit()

         response.status(200).send({ type: true, data: arrEquipa })
      } catch (error) {
         await trx.rollback()
         console.log(error)
         response.status(400).send(error)
      }
   }
}

module.exports = ConverterController
