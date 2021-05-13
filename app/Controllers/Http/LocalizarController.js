'use strict'

const lodash = require('lodash')
const PessoaServices = use('App/Services/Pessoa')
const Database = use('Database')

class LocalizarController {
   async proxy({ response, request }) {
      let { start, count } = request.get()
      let continuar = request.only(['continue'])
      let perPage = null
      let payload = request.all()

      let page = payload.page
      let limit = payload.limit

      if (!continuar) {
         continuar = false
         page = payload.page
         limit = payload.limit
      } else {
         continuar = lodash.isEmpty(continuar) ? false : continuar.continue
      }

      /*if ( ! continuar ) {
         page= payload.page
         limit= payload.limit
      }*/

      if (!lodash.has(payload, 'whereStatus')) {
         //payload.whereStatus = ['equipamentos.status', 'like', '%%']
      } else {
         payload.whereStatus = [
            'equipamentos.status',
            'like',
            payload.whereStatus,
         ]
      }

      if (start) {
         page = parseInt(page)
         start = parseInt(start)
         count = parseInt(count)
         limit = parseInt(count)
      } else {
         limit = parseInt(payload.limit)
      }
      /*if ( start) {
         start= parseInt(start)
         count= parseInt(count)
         if ( (start % count) === 0) {
            page= (start / count ) + 1
         } else {
            if ( start % count === 1 ) {
               page= (start / count ) + 1
            } else {
               page= (( start + 1) / count ) + 1
            }

         }

         perPage= count
         limit= count
      } else {
         limit= 3
      }*/

      let where = null

      let o = {
         page,
         limit,
         start,
         count,
         perPage,
         continuar,
         where,
         whereStatus: payload.whereStatus,
      }

      if (payload.field_name === 'Nome' || payload.field_name === 'CPF/CNPJ') {
         if (payload.field_name === 'CPF/CNPJ') {
            payload.field_name = 'cpfCnpj'
         }
         if (payload.field_name === 'Nome') {
            payload.field_name = 'nome'
         }
         if (!lodash.isEmpty(payload.field_value)) {
            o.where = [
               payload.field_name,
               'like',
               '%' + payload.field_value + '%',
            ]
         }
         o.whereStatus = null

         return this.localizarAssociado(response, o)
      }

      if (payload.field_name === 'parcela') {
         if (!lodash.isEmpty(payload.field_value)) {
            o.where = [
               payload.field_name,
               'like',
               '%' + payload.field_value + '%',
            ]
         }
         //o.whereStatus = ['status', 'like', 'Ativo']
         return this.localizarAssociado(response, o)
      }

      if (payload.field_name === 'Placa') {
         if ( !lodash.isEmpty(payload.field_value)) {
            payload.field_value = payload.field_value.replace('-', '')
         }

         if (!lodash.isEmpty(payload.field_value)) {
            /*o.where= ['equipamentos.placa1','like', '%'+payload.field_value+"%"]
            o.orWhere= ['equipamentos.placa2','like', '%'+payload.field_value+"%"]
            o.orWhere= ['equipamentos.placa3','like', '%'+payload.field_value+"%"]*/
            o.where = [
               'equipamentos.placas',
               'like',
               '%' + payload.field_value + '%',
            ]
         } else {
            o.where = ['equipamentos.placas', 'like', '%%']
         }
         if (payload.status) {
            //o.whereStatus= payload.status
         }

         return this.localizarEquipamento(response, o)
      }

      if (payload.field_name === 'Adesao') {
         let inicio = null
         let fim = null
         if (payload.field_value_periodo) {
            inicio = payload.field_value_periodo.start
            fim = payload.field_value_periodo.end
         }

         if (!inicio) {
            return response
               .status(200)
               .send({ total_count: 0, pos: 0, data: [] })
         }

         const o = Database.from('equipamentos')
            .select(
               'equipamentos.id',
               'pessoas.nome',
               'equipamentos.placas',
               'equipamentos.status',
               'pessoas.id as pessoa_id'
            )
            .innerJoin('pessoas', 'equipamentos.pessoa_id', 'pessoas.id')
            .orderBy('pessoas.nome', 'asc')
            .whereBetween('dAdesao', [inicio, fim])
            .paginate(
               lodash.isUndefined(payload.page) ? 1 : payload.page,
               payload.limit
            )

         let res = await o

         res.total_count = res.total
         //res.continue= payload.continuar

         delete res.total
         delete res.perPage
         delete res.page
         delete res.lastPage

         if (payload.continuar) {
            res.pos = payload.start
         } else {
            res.pos = 0
         }
         //let r= { data: res, total_count: res.length, continue: payload.continuar, pos: payload.pos, page: payload.page, limit: payload.limit}
         response.status(200).send(res)
      }
   }

   async localizarAssociado(response, payload) {
      try {
         const pessoa = await new PessoaServices().index(payload)
         pessoa.pages.total_count = pessoa.pages.total

         delete pessoa.pages.total
         delete pessoa.pages.perPage
         delete pessoa.pages.page
         delete pessoa.pages.lastPage

         if (payload.continuar) {
            pessoa.pages.pos = payload.start
         } else {
            pessoa.pages.pos = 0
         }

         response.status(200).send(pessoa)
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async localizarEquipamento(response, payload) {
      try {
         const o = Database.from('equipamentos')
            .select(
               'equipamentos.id',
               'pessoas.nome',
               'equipamentos.placas',
               'equipamentos.status',
               'pessoas.id as pessoa_id'
            )
            .innerJoin('pessoas', 'equipamentos.pessoa_id', 'pessoas.id')
            .orderBy('pessoas.nome', 'asc')
            .where(payload.where[0], payload.where[1], payload.where[2])
            /*.where(
               payload.whereStatus[0],
               payload.whereStatus[1],
               payload.whereStatus[2]
            )*/
            .paginate(
               lodash.isUndefined(payload.page) ? 1 : payload.page,
               payload.limit
            )

         let res = await o

         res.total_count = res.total
         //res.continue= payload.continuar

         delete res.total
         delete res.perPage
         delete res.page
         delete res.lastPage

         if (payload.continuar) {
            res.pos = payload.start
         } else {
            res.pos = 0
         }
         //let r= { data: res, total_count: res.length, continue: payload.continuar, pos: payload.pos, page: payload.page, limit: payload.limit}
         response.status(200).send(res)
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }
}

module.exports = LocalizarController
