'use strict'

const Model = use('App/Models/LancamentoConfig')
const ServicePlanoContas = use('App/Services/PlanoDeConta')

const Database = use('Database')

class LancamentoConfig {
   async add(data) {
      try {
         let busca = await Database.from('lancamento_configs').first()

         if (busca) {
            return this.update(busca.id, data)
         }

         const model = await Model.create(data)

         return model
      } catch (e) {
         throw e
      }
   }

   async get(ID) {
      try {
         const model = await Model.findOrFail(ID)

         return model
      } catch (e) {
         throw e
      }
   }

   async index() {
      try {
         const model = await Model.query().fetch()

         return model
      } catch (e) {
         throw e
      }
   }

   async update(ID, data) {
      try {
         let busca = await Database.from('lancamento_configs').first()

         if (!busca) {
            return this.add(data)
         }

         ID = busca.id

         let model = await Model.findOrFail(ID)

         model.merge(data)

         await model.save()

         return model
      } catch (e) {
         throw {
            message: e.message,
            sqlMessage: e.sqlMessage,
            sqlState: e.sqlState,
            errno: e.errno,
            code: e.code,
         }
      }
   }

   async del(ID) {
      try {
         const model = await Model.findOrFail(ID)
         await model.delete()

         return model
      } catch (e) {
         throw e
      }
   }

   async getPlanoConta(field) {
      /* Retorna o id do plano de contas de um field da configuração de lancamentos */
      try {
         const registro = await this.index()
         if (!registro) {
            return null
         }
         const arrJson = registro.toJSON()
         const json = arrJson[0]
         let ID_PlanoConta = null

         if (field === 'receber-debito-inadimplente') {
            ID_PlanoConta = json.receber_plano_id_dInad
         }

         if (field === 'receber-credito-inadimplente') {
            ID_PlanoConta = json.receber_plano_id_cInad
         }

         const plano = await new ServicePlanoContas().get(ID_PlanoConta)
         if (!plano) {
            return null
         }
         const planoJson = plano.toJSON()
         return planoJson.id
      } catch (e) {
         return null
      }
   }
}

module.exports = LancamentoConfig
