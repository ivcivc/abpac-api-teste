'use strict'

const Pessoa = use('App/Models/Pessoa')
const File = use('App/Models/File')

const uuid = require('uuid')

class PastaController {
   async getPessoa({ params, response }) {
      try {
         const modelPessoa = await Pessoa.findOrFail(params.id)
         //await modelPessoa.load('pendencias')

         const pessoa_id = modelPessoa.id
         const pessoaJson = modelPessoa.toJSON()

         let resPessoa = [
            {
               id: uuid.v1(),
               pessoa_id: pessoaJson.id,
               value: 'Cadastro',
               _table: 'pessoa',
               _id: null,
               data: [],
            },
         ]

         // Pendencias
         const documentos = []
         const fileModel = await File.query()
            .where('modulo', 'associado')
            .where('pessoa_id', pessoa_id)
            .fetch()
         fileModel.rows.forEach(f => {
            let o = {}
            o._id = f.id
            o.id = uuid.v4()
            o.value = f.descricao
            o.table = 'file'
            o.webix_kids = true
            documentos.push(o)
         })

         resPessoa[0].data.push({
            id: uuid.v4,
            pessoa_id: pessoaJson.id,
            value: 'Documentos',
            _table: 'pessoa_file',
            _id: null,
            data: documentos,
         })

         response.status(200).send(resPessoa)
      } catch (error) {
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }
}

module.exports = PastaController
