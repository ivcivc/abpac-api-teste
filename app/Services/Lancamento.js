'use strict'

const moment = require('moment')

const Model = use('App/Models/Lancamento')
const ModelItem = use('App/Models/LancamentoItem')
const ModelStatus = use('App/Models/LancamentoStatus')

const ServiceConfig = use('App/Services/LancamentoConfig')

const lodash = require('lodash')

const Database = use('Database')

//const Mo = use('App/Models/OcorrenciaTerceiro')

class Lancamento {
   async get(ID) {
      try {
         const model = await Model.findOrFail(ID)
         if (model.pessoa_id) {
            await model.load('pessoa')
         }

         await model.load('items')

         let json = model.toJSON()

         return json
      } catch (e) {
         throw e
      }
   }

   async add(data, trx, auth) {
      let nrErro = null
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         data.historico = ''
         let items = data.items
         let isFixo = false
         let sair = false
         items.forEach(e => {
            delete e['planoDeConta']
            if (e.id < 0) {
               delete e['id']
            }
            if (e.tag === 'LF') {
               data.historico = e.descricao
               isFixo = true
               sair = true
               return
            }
            if (!sair) {
               data.historico = e.descricao
               sair = true
            }
         })
         delete data['items']
         delete data['pessoa']

         let quitacoes = []
         if (lodash.has(data, 'quitacoes')) {
            if (data.quitacoes) {
               data.quitacoes.forEach(e => {
                  items.push(e)
               })
            }
         }
         delete data['quitacoes']

         if (!lodash.isEmpty(data.dRecebimento)) {
            if (
               data.valorTotal !==
               data.valorCompensado -
                  data.valorCompensadoAcresc +
                  data.valorCompensadoDesc
            ) {
               nrErro = -100
               throw {
                  success: false,
                  message:
                     'Transação abortada. O valor de recebimento não confere com o valor da conta.',
               }
            }
         }

         const model = await Model.create(data, trx ? trx : null)
         await model.items().createMany(items, trx ? trx : null)

         /* Status */
         let status = {
            lancamento_id: model.id,
            user_id: auth.user.id,
            motivo: `Aberto`,
            status: data.situacao,
         }
         if (data.situacao === 'Compensado') {
            status.motivo = 'Aberto/Compensado'
         }
         await ModelStatus.create(status, trx ? trx : null)

         await trx.commit()

         if (model.pessoa_id) {
            await model.load('pessoa')
         }

         await model.load('items')

         return model
      } catch (e) {
         await trx.rollback()
         if (nrErro) {
            if (nrErro === -100) {
               e.code = 'PERSONALIZADO'
               throw e
            }
         }
         throw {
            message: e.message,
            sqlMessage: e.sqlMessage,
            sqlState: e.sqlState,
            errno: e.errno,
            code: e.code,
         }
      }
   }

   async update(ID, data, trx, auth) {
      let nrErro = null
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         let model = await Model.findOrFail(ID)
         delete data['pessoa']

         const update_at_db = moment(model.updated_at).format()
         const update_at = moment(data.updated_at).format()

         if (update_at_db !== update_at) {
            nrErro = -100
            throw {
               success: false,
               message:
                  'Transação abortada! Este registro foi alterado por outro usuário.',
            }
         }

         if (model.status !== data.status || model.situacao !== data.situacao) {
            /* lançar novo status */
         }

         let items = data['items']
         items.forEach(e => {
            delete e['id']
            delete e['planoDeConta']
            e.lancamento_id = model.id
         })
         delete data['items']

         let quitacoes = []
         if (lodash.has(data, 'quitacoes')) {
            if (data.quitacoes) {
               data.quitacoes.forEach(e => {
                  items.push(e)
               })
            }
         }
         delete data['quitacoes']

         if (data.situacao !== model.situacao) {
            const status = {
               lancamento_id: model.id,
               user_id: auth.user.id,
               motivo: 'Alteração de status',
               status: data.situacao,
            }
            await ModelStatus.create(status, trx ? trx : null)
         }

         //const itemsDB = await model.items() //.fetch()
         //itemsDB.delete(trx)
         await model
            .items()
            .where('lancamento_id', model.id)
            .delete(trx ? trx : null)

         model.merge(data)

         await model.items().createMany(items, trx ? trx : null)

         await model.save(trx ? trx : null)

         await trx.commit()

         await model.load('items')
         if (model.pessoa_id) {
            await model.load('pessoa')
         }

         return model
      } catch (e) {
         await trx.rollback()
         if (nrErro) {
            if (nrErro === -100) {
               throw e
            }
         }
         throw {
            message: e.message,
            sqlMessage: e.sqlMessage,
            sqlState: e.sqlState,
            errno: e.errno,
            code: e.code,
         }
      }
   }

   async localizarPor(payload) {
      try {
         let dVencInicio = null
         let dVencFim = null
         let modulo = payload.modulo

         if (payload.field_value_periodo) {
            dVencInicio = payload.field_value_periodo.start
            dVencFim = payload.field_value_periodo.end
         }
         console.log(payload.field_value_periodo.start)

         let query = null //.fetch()

         if (modulo === 'todos') {
            if (dVencInicio) {
               query = await Model.query()
                  .with('pessoa')
                  .whereBetween('dVencimento', [
                     dVencInicio.substr(0, 10),
                     dVencFim.substr(0, 10),
                  ])
                  .fetch()
            }
         }

         //await query.paginate(1, 20) //.fetch()

         return query
      } catch (e) {
         throw e
      }
   }

   async cancelar(payload, trx, auth) {
      let nrErro = null
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }
         let model = await Model.findOrFail(payload.id)

         const update_at_db = moment(model.updated_at).format()
         const update_at = moment(payload.updated_at).format()

         if (update_at_db !== update_at) {
            nrErro = -100
            throw {
               success: false,
               message:
                  'Cancelamento não autorizado. Este registro foi alterado por outro usuário.',
            }
         }

         const status = {
            lancamento_id: model.id,
            user_id: auth.user.id,
            motivo: `De: ${model.status}/${model.situacao} - Para: ${model.status}/Cancelado`,
            status: 'Cancelado',
         }
         await ModelStatus.create(status, trx ? trx : null)

         if (model.situacao !== 'Aberto' && model.tipo === 'Pagar') {
            nrErro = -100
            throw { success: false, message: 'Cancelamento não autorizado.' }
         }

         if (model.situacao !== 'Aberto' && model.tipo === 'Receber') {
            nrErro = -100
            throw { success: false, message: 'Cancelamento não autorizado.' }
         }
         model.situacao = 'Cancelado'

         await model.save(trx ? trx : null)

         await trx.commit()

         await model.load('items')
         if (model.pessoa_id) {
            await model.load('pessoa')
         }

         return model
      } catch (e) {
         await trx.rollback()
         if (nrErro) {
            if (nrErro === -100) {
               throw e
            }
         }
         throw {
            message: e.message,
            sqlMessage: e.sqlMessage,
            sqlState: e.sqlState,
            errno: e.errno,
            code: e.code,
         }
      }
   }

   async reverter_cancelamento(payload, trx, auth) {
      let nrErro = null
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         let model = await Model.findOrFail(payload.id)

         const update_at_db = moment(model.updated_at).format()
         const update_at = moment(payload.updated_at).format()

         if (update_at_db !== update_at) {
            nrErro = -100
            throw {
               success: false,
               message:
                  'Reversão não autorizada. Este registro foi alterado por outro usuário.',
            }
         }

         const status = {
            lancamento_id: model.id,
            user_id: auth.user.id,
            motivo: `De: ${model.status}/${model.situacao} - Para: ${model.status}/Aberto`,
            status: 'Aberto',
         }
         await ModelStatus.create(status, trx ? trx : null)

         if (model.parent_id > 0) {
            nrErro = -100
            throw {
               success: false,
               message: 'Não é possível reverter essa conta',
            }
         }

         if (model.situacao !== 'Cancelado' && model.tipo === 'Pagar') {
            nrErro = -100
            throw { success: false, message: 'Reversão não autorizada.' }
         }

         if (model.situacao !== 'Cancelado' && model.tipo === 'Receber') {
            nrErro = -100
            throw { success: false, message: 'Cancelamento não autorizado.' }
         }
         model.situacao = 'Aberto'

         await model.save(trx ? trx : null)

         await trx.commit()

         await model.load('items')
         if (model.pessoa_id) {
            await model.load('pessoa')
         }

         return model
      } catch (e) {
         await trx.rollback()
         if (nrErro) {
            if (nrErro === -100) {
               throw e
            }
         }
         throw {
            message: e.message,
            sqlMessage: e.sqlMessage,
            sqlState: e.sqlState,
            errno: e.errno,
            code: e.code,
         }
      }
   }

   async inadimplente(payload, trx, auth) {
      let nrErro = null
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         let planoContaID = await new ServiceConfig().getPlanoConta(
            'receber-debito-inadimplente'
         )

         if (!planoContaID) {
            nrErro = -100
            throw {
               success: false,
               message:
                  'Transação abortada! Arquivo de configuração não localizado.',
            }
         }

         let model = await Model.findOrFail(payload.id)
         let modelClone = model.toJSON()

         const update_at_db = moment(model.updated_at).format()
         const update_at = moment(payload.updated_at).format()

         if (update_at_db !== update_at) {
            nrErro = -100
            throw {
               success: false,
               message:
                  'Geração de inadimplentes rejeitada. Este registro foi alterado por outro usuário.',
            }
         }

         if (model.status !== 'Aberto') {
            nrErro = -100
            throw {
               success: false,
               message: 'Não é possível reverter essa conta',
            }
         }

         if (moment(model.dVencimento) < moment()) {
            nrErro = -100
            throw {
               success: false,
               message: 'Operação permitida apenas para contas vencidas',
            }
         }

         const status = {
            lancamento_id: model.id,
            user_id: auth.user.id,
            //motivo: `Inadimplente`,
            motivo: `De: ${model.status}/${model.situacao} - Para: Inadimplente/Compensado`,
            status: model.situacao,
         }
         await ModelStatus.create(status, trx ? trx : null)

         model.status = 'Inadimplente'
         model.situacao = 'Compensado'
         model.dRecebimento = moment(new Date()).format('YYYY-MM-DD')
         model.valorCompensado = model.valorTotal

         /* Criar novo registo de inadimplentes */
         delete modelClone['id']
         modelClone.status = 'Inadimplente'
         modelClone.situacao = 'Aberto'
         modelClone.isConciliado = false
         modelClone.inadimplente = 'Sim'
         modelClone.parent_id = model.id
         modelClone.historico = 'Inadimplente'
         modelClone.dRecebimento = null
         modelClone.valorCompensado = 0.0

         const modelAdd = await Model.create(modelClone, trx ? trx : null)

         const statusClone = {
            lancamento_id: modelAdd.id,
            user_id: auth.user.id,
            motivo: `Inadimplente`,
            status: 'Inadimplente',
         }
         await ModelStatus.create(statusClone, trx ? trx : null)

         await ModelItem.create(
            {
               DC: 'C',
               tag: 'ID',
               lancamento_id: modelAdd.id,
               descricao: 'Inadimplente',
               planoDeConta_id: planoContaID,
               valor: modelClone.valorTotal,
            },
            trx ? trx : null
         )

         await model.save(trx ? trx : null)

         await trx.commit()
         //await trx.rollback()

         await model.load('items')
         await modelAdd.load('items')

         if (model.pessoa_id) {
            await model.load('pessoa')
            await modelAdd.load('pessoa')
         }

         return { success: true, atual: model, novo: modelAdd }
      } catch (e) {
         await trx.rollback()
         if (nrErro) {
            if (nrErro === -100) {
               throw e
            }
         }
         throw {
            message: e.message,
            sqlMessage: e.sqlMessage,
            sqlState: e.sqlState,
            errno: e.errno,
            code: e.code,
         }
      }
   }

   async reverter_inadimplente(payload, trx, auth) {
      let nrErro = null
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         let model = await Model.findOrFail(payload.id)

         const update_at_db = moment(model.updated_at).format()
         const update_at = moment(payload.updated_at).format()

         if (update_at_db !== update_at) {
            nrErro = -100
            throw {
               success: false,
               message:
                  'Reversão de inadimplentes rejeitada. Este registro foi alterado por outro usuário.',
            }
         }

         if (model.status !== 'Inadimplente' || model.situacao !== 'Aberto') {
            nrErro = -100
            throw {
               success: false,
               message: 'Não é possível reverter essa conta',
            }
         }

         if (model.inadimplente !== 'Sim') {
            nrErro = -100
            throw {
               success: false,
               message:
                  'Reversão de inadimplentes rejeitada. Este registro foi rateado.',
            }
         }

         const status = {
            lancamento_id: model.id,
            user_id: auth.user.id,
            motivo: `Reversão`,
            status: 'Cancelado',
         }
         await ModelStatus.create(status, trx ? trx : null)

         model.historico = 'Inadimplente (revertido)'
         model.situacao = 'Cancelado'

         const parent_id = model.parent_id

         /* Recuperar o ristro pai */
         let modelPai = await Model.findOrFail(parent_id)

         modelPai.status = 'Aberto'
         modelPai.situacao = 'Aberto'
         modelPai.dRecebimento = null
         modelPai.valorCompensado = 0
         modelPai.isConciliado = false
         modelPai.parent_id = null
         modelPai.documento = null
         modelPai.documentoNr = ''

         if (payload.situacao !== model.situacao) {
            const status = {
               lancamento_id: modelPai.id,
               user_id: auth.user.id,
               motivo: `Reversão de inadimplente`,
               status: 'Aberto',
            }
            await ModelStatus.create(status, trx ? trx : null)
         }

         await model.save(trx ? trx : null)
         await modelPai.save(trx ? trx : null)

         await trx.commit()

         await model.load('items')
         await modelPai.load('items')

         if (model.pessoa_id) {
            await model.load('pessoa')
            await modelPai.load('pessoa')
         }

         return { success: true, atual: model, revertido: modelPai }
      } catch (e) {
         await trx.rollback()
         if (nrErro) {
            if (nrErro === -100) {
               throw e
            }
         }
         throw {
            message: e.message,
            sqlMessage: e.sqlMessage,
            sqlState: e.sqlState,
            errno: e.errno,
            code: e.code,
         }
      }
   }

   async addStatus(data, trx, auth) {
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         data.user_id = auth.user.id

         const model = await Model.findOrFail(data.lancamento_id)
         model.status = data.status
         model.save(trx ? trx : null)

         const status = data
         await ModelStatus.create(status, trx ? trx : null)

         await trx.commit()

         return model
      } catch (e) {
         await trx.rollback()
         throw e
      }
   }
}

module.exports = Lancamento
