'use strict'

const moment = require('moment')

const Model = use('App/Models/Lancamento')
const ModelItem = use('App/Models/LancamentoItem')
const ModelStatus = use('App/Models/LancamentoStatus')
const ModelBoleto = use('App/Models/Boleto')
const ModelConta = use('App/Models/Conta')
const ModelBoletoConfig = use('App/Models/BoletoConfig')
const ModelPessoa = use('App/Models/Pessoa')

const Boleto = use('App/Services/Cnab')

const ServiceConfig = use('App/Services/LancamentoConfig')

const lodash = require('lodash')

const Database = use('Database')

const Redis = use('Redis')
const kue = use('Kue')
const Job = use('App/Jobs/ACBr')

//const Mo = use('App/Models/OcorrenciaTerceiro')

class Lancamento {
   async get(ID) {
      try {
         const model = await Model.findOrFail(ID)
         if (model.pessoa_id) {
            await model.load('pessoa')
         }

         await model.load('items')
         await model.load('boletos')

         let json = model.toJSON()

         return json
      } catch (e) {
         throw e
      }
   }

   async add(data, trx, auth, isJobs = true, isCommit = true) {
      let nrErro = null
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         if (data.forma === 'boleto' && data.tipo === 'Receita') {
            const livre = await Redis.get('_gerarFinanceiro')
            if (livre !== 'livre' && livre !== 'financeiro') {
               nrErro = -100
               throw {
                  success: false,
                  message:
                     'Transação abortada. O servidor de emissão de boletos está ocupado. Tente mais tarde!',
               }
            }
         }

         data.historico = !lodash.isEmpty(data.historico) ? data.historico : ''
         let items = data.items
         let isFixo = false
         let sair = false
         items.forEach(e => {
            delete e['planoDeConta']
            if (e.id < 0) {
               delete e['id']
            }
            if (e.tag === 'LF') {
               if (lodash.isEmpty(data.historico)) {
                  data.historico = e.descricao
               }

               isFixo = true
               sair = true
               return
            }
            if (!sair) {
               data.historico = data.historico = e.descricao
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

         if (isCommit) {
            await trx.commit()
         }

         if (model.pessoa_id) {
            await model.load('pessoa')
         }

         // Gerar remessa - Kue
         if (isJobs) {
            if (
               data.situacao !== 'Compensado' &&
               model.tipo === 'Receita' &&
               model.forma === 'boleto'
            ) {
               let dados = model.toJSON()
               let arrLancamentos = []
               arrLancamentos.push(dados)
               let aut = auth.user //.toJSON()
               let oAuth = { user: aut }
               const data = {
                  lancamentos: arrLancamentos,
                  auth: oAuth,
                  metodo: 'gerarCobranca',
               } // Data to be passed to job handle
               const priority = 'normal' // Priority of job, can be low, normal, medium, high or critical
               const attempts = 1 // Number of times to attempt job if it fails
               const remove = true // Should jobs be automatically removed on completion
               const jobFn = job => {
                  // Function to be run on the job before it is saved
                  job.backoff()
               }
               const job = kue.dispatch(Job.key, data, {
                  priority,
                  attempts,
                  remove,
                  jobFn,
               })

               // If you want to wait on the result, you can do this
               const result = await job.result
               let x = 1
            }
         }

         return model
      } catch (e) {
         if (isCommit) {
            await trx.rollback()
         }

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

   async addMassa(data, trx, auth, isJobs = true) {
      // Geração de lançamentos em massa (rateio - gerarFinanceiro)

      let nrErro = null
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         data.historico = !lodash.isEmpty(data.historico) ? data.historico : ''
         let items = data.items
         let isFixo = false
         let sair = false
         items.forEach(e => {
            delete e['planoDeConta']
            if (e.id < 0) {
               delete e['id']
            }
            if (e.tag === 'LF') {
               if (lodash.isEmpty(data.historico)) {
                  data.historico = e.descricao
               }

               isFixo = true
               sair = true
               return
            }
            if (!sair) {
               data.historico = data.historico = e.descricao
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

         if (model.pessoa_id) {
            await model.load('pessoa')
         }

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
         let pessoa_id = payload.field_value_pessoa_id

         if (payload.field_value_periodo) {
            dVencInicio = payload.field_value_periodo.start
            dVencFim = payload.field_value_periodo.end
         }

         let query = null //.fetch()

         if (modulo === 'todos') {
            if (dVencInicio && pessoa_id) {
               query = await Model.query()
                  .with('pessoa')
                  /*.whereBetween('dVencimento', [
                     dVencInicio.substr(0, 10),
                     dVencFim.substr(0, 10),
                  ])*/
                  .whereNot({ situacao: 'Bloqueado' })
                  .where('pessoa_id', pessoa_id)
                  .fetch()
            }
            if (dVencInicio && !pessoa_id) {
               query = await Model.query()
                  .with('pessoa')
                  .whereBetween('dVencimento', [
                     dVencInicio.substr(0, 10),
                     dVencFim.substr(0, 10),
                  ])
                  .whereNot({ situacao: 'Bloqueado' })
                  .fetch()
            }
            if (!dVencInicio && pessoa_id) {
               query = await Model.query()
                  .with('pessoa')

                  .whereNot({ situacao: 'Bloqueado' })
                  .where('pessoa_id', pessoa_id)
                  .fetch()
            }
            if (!dVencInicio && !pessoa_id) {
               query = []
            }
         }

         if (modulo === 'atrasado') {
            if (dVencInicio) {
               query = await Model.query()
                  .with('pessoa')
                  .whereBetween('dVencimento', [
                     dVencInicio.substr(0, 10),
                     dVencFim.substr(0, 10),
                  ])
                  .where({ situacao: 'aberto' })
                  .fetch()
            }
         }

         if (modulo === 'recente') {
            query = await Model.query()
               .with('pessoa')
               .orderBy('updated_at', 'desc')
               //.where({ situacao: 'aberto' })
               .limit(40)
               .fetch()
         }

         if (modulo === 'acordo') {
            const pessoa_id = payload.field_value_pessoa_id
            const tipo = payload.tipo

            query = await Model.query()
               .with('pessoa')
               .where('pessoa_id', pessoa_id)
               .andWhere('tipo', tipo)
               .orderBy('situacao', 'asc')
               .fetch()
         }

         if (modulo === 'os') {
            if (dVencInicio) {
               query = await Model.query()
                  .with('pessoa')
                  .whereBetween('dVencimento', [
                     dVencInicio.substr(0, 10),
                     dVencFim.substr(0, 10),
                  ])
                  .where({ situacao: 'Bloqueado' })
                  .fetch()
            }
            /*query = await Model.query()
               .with('pessoa')
               .where('situacao', 'Bloqueado')
               .orderBy('situacao', 'asc')
               .fetch()*/
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

         if (
            model.inadimplente === 'Debito' ||
            model.inadimplente === 'Credito'
         ) {
            nrErro = -100
            throw {
               success: false,
               message:
                  'Cancelamento não autorizado. Esta conta foi rateada com inadimplente.',
            }
         }

         if (model.situacao === 'Compensado') {
            nrErro = -100
            throw {
               success: false,
               message:
                  'Cancelamento não autorizado. Esta conta foi liquidada.',
            }
         }

         const status = {
            lancamento_id: model.id,
            user_id: auth.user.id,
            motivo: `De: ${model.status}/${model.situacao} - Para: ${model.status}/Cancelado`,
            status: 'Cancelado',
         }
         await ModelStatus.create(status, trx ? trx : null)

         if (model.situacao !== 'Aberto' && model.tipo === 'Despesa') {
            nrErro = -100
            throw { success: false, message: 'Cancelamento não autorizado.' }
         }

         if (model.situacao !== 'Aberto' && model.tipo === 'Receita') {
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

   async cancelar_compensacao(payload, trx, auth) {
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

         if (model.situacao !== 'Compensado') {
            nrErro = -100
            throw {
               success: false,
               message:
                  'Cancelamento não autorizado. Esta conta ainda não foi liquidada.',
            }
         }

         const status = {
            lancamento_id: model.id,
            user_id: auth.user.id,
            motivo: `De: ${model.status}/${model.situacao} - Para: ${model.status}/Aberto`,
            status: 'Aberto',
         }
         await ModelStatus.create(status, trx ? trx : null)

         model.merge({
            situacao: 'Aberto',
            valorCompensado: 0.0,
            valorCompensadoAcresc: 0.0,
            valorCompensadoDesc: 0.0,
            valorCompensadoPrej: 0.0,
            dRecebimento: null,
         })

         await ModelItem.query()
            .where('lancamento_id', model.id)
            .whereIn('tag', ['QA', 'QD', 'QP'])
            .transacting(trx ? trx : null)
            .delete()

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

         if (model.situacao !== 'Cancelado' && model.tipo === 'Despesa') {
            nrErro = -100
            throw { success: false, message: 'Reversão não autorizada.' }
         }

         if (model.situacao !== 'Cancelado' && model.tipo === 'Receita') {
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

         let model = await Model.findOrFail(payload.id)

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
               message: 'Não é possível transformar em conta inadimplente',
            }
         }

         if (moment(model.dVencimento).isAfter(moment())) {
            // moment(model.dVencimento) < moment()
            nrErro = -100
            throw {
               success: false,
               message: 'Operação permitida apenas para contas vencidas',
            }
         }

         const novoStatus = 'Inadimplente'
         const status = {
            lancamento_id: model.id,
            user_id: auth.user.id,
            //motivo: `Inadimplente`,
            motivo: `De: ${model.status}/${model.situacao} - Para: ${model.situacao}/Inadimplente`,
            status: novoStatus,
         }
         await ModelStatus.create(status, trx ? trx : null)

         model.merge({ inadimplente: 'Sim', status: 'Inadimplente' })

         await model.save(trx ? trx : null)

         await trx.commit()
         //await trx.rollback()

         await model.load('items')

         if (model.pessoa_id) {
            await model.load('pessoa')
         }

         return { success: true, atual: model, novo: model }
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

         if (model.status !== 'Inadimplente') {
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
            motivo: `Reversão Inadimplente`,
            status: model.situacao,
         }
         await ModelStatus.create(status, trx ? trx : null)

         let cStatus = model.status
         if (model.status === 'Inadimplente') {
            cStatus = 'Aberto'
         }

         model.merge({ inadimplente: 'Não', status: cStatus })

         await model.save(trx ? trx : null)

         await trx.commit()

         await model.load('items')

         if (model.pessoa_id) {
            await model.load('pessoa')
         }

         return { success: true, atual: model, revertido: model }
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

   async acordo(payload, trx, auth) {
      let nrErro = null

      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         let operacao = payload.operacao
         let conta_id = payload.conta_id
         let inadimplente = null
         let forma = payload.forma
         let tipo = payload.tipo

         let grupo_id = payload.grupo_id
         if (!operacao) {
            nrErro = -100
            throw {
               success: false,
               message: 'Grupo não informado.',
            }
         }

         if (!operacao) {
            nrErro = -100
            throw {
               success: false,
               message: 'Não foi informado o tipo de operação.',
            }
         }

         let arrAddLancamentos = payload.addLancamentos
         if (arrAddLancamentos.length <= 0) {
            nrErro = -100
            throw {
               success: false,
               message: 'Lista de novas contas não recebida.',
            }
         }

         let arrLista = []
         let arrListaID = []
         payload.lista.forEach(e => {
            arrLista.push({ id: e.id, updated_at: e.updated_at })
            arrListaID.push(e.id)
         })

         if (arrLista.length <= 0) {
            nrErro = -100
            throw {
               success: false,
               message: 'Selecione as contas para efetivação do acordo.',
            }
         }

         const modelLista = await Model.query()
            //.transacting(trx ? trx : null)
            //.update({ equipamento_id: equipamentoAdd.id })
            .whereIn('id', arrListaID)
            .fetch()

         modelLista.rows.forEach(e => {
            inadimplente = e.inadimplente

            let o = lodash.find(arrLista, { id: e.id })
            if (!o) {
               nrErro = -100
               throw {
                  success: false,
                  message: 'Conta não localizada no servidor.',
               }
            }
            const update_at_db = moment(e.updated_at).format()
            const update_at = moment(o.updated_at).format()

            if (update_at_db !== update_at) {
               nrErro = -100
               throw {
                  success: false,
                  message:
                     'Transação abortada. Uma conta selecionada foi alterada por outro usuário.',
               }
            }
         })

         //arrAddLancamentos.forEach( e => {
         for (let i in arrAddLancamentos) {
            let o = {
               forma: arrAddLancamentos[i].forma,
               subGrupo_id: grupo_id,
               conta_id: conta_id,
               dCompetencia: arrAddLancamentos[i].dCompetencia,
               dVencimento: arrAddLancamentos[i].dVencimento,
               historico:
                  operacao === 'acordo' ? 'Acordo' : 'Acordo inadimplente',
               inadimplente: inadimplente,
               isConciliado: 0,
               nota: arrAddLancamentos[i].nota,
               parcelaF: arrAddLancamentos[i].parcelaF,
               parcelaI: arrAddLancamentos[i].parcelaI,
               pessoa_id: arrAddLancamentos[i].pessoa_id,
               tipo: tipo,
               valorBase: arrAddLancamentos[i].valorBase,
               valorAcresc: arrAddLancamentos[i].valorAcrescimo,
               valorDesc:
                  arrAddLancamentos[i].valorDesconto > 0
                     ? arrAddLancamentos[i].valorDesconto
                     : arrAddLancamentos[i].valorPrejuizo,
               //valorPrejuizo: arrAddLancamentos[i].valorPrejuizo,
               valorTotal: arrAddLancamentos[i].valorTotal,
               status: operacao === 'acordo' ? 'Acordado' : 'Acordado',
               situacao: operacao === 'acordo' ? 'Aberto' : 'Aberto',
            }

            let model = await Model.create(o, trx ? trx : null)
            await model
               .items()
               .createMany(arrAddLancamentos[i].items, trx ? trx : null)

            /* Status */
            let status = {
               lancamento_id: model.id,
               user_id: auth.user.id,
               motivo:
                  operacao === 'acordo' ? 'Acordado' : 'Acordo inadimplente',
               status: operacao === 'acordo' ? 'Acordado' : 'Aberto',
            }
            await ModelStatus.create(status, trx ? trx : null)
         }

         //payload.lista.forEach(e => {
         for (let i in arrLista) {
            let modelUpdate = await Model.findOrFail(arrLista[i].id)
            if (operacao === 'acordo-inadimplente') {
               modelUpdate.situacao = 'Acordado'
            }
            if (operacao === 'acordo') {
               modelUpdate.situacao = 'Compensado'
               modelUpdate.valorCompensado = modelUpdate.valorTotal
            }

            modelUpdate.grupo_id = grupo_id

            let status = {
               lancamento_id: modelUpdate.id,
               user_id: auth.user.id,
               motivo: operacao === 'acordo' ? 'Acordo' : 'Acordo inadimplente',
               status: operacao === 'acordo' ? 'Acordado' : 'Acordado',
            }
            await ModelStatus.create(status, trx ? trx : null)

            await modelUpdate.save(trx ? trx : null)
         }

         await trx.commit()
         //await trx.rollback()

         return { modelLista }
         //await trx.commit()
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

   async gerarLancamentos(payload, trx, auth, onTrx = true) {
      let nrErro = null

      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }
         const grupo_id = payload.grupo_id
         const historico = payload.historico
         const tipo = payload.tipo
         const status = 'Aberto'
         let situacao = 'Bloqueado'
         const ordem_servico_status = payload.ordem_servico_status
         const ordem_servico_id = payload.ordem_servico_id
         const equipamento_id = payload.equipamento_id

         const listaID = []

         if (ordem_servico_id && ordem_servico_status === 'Finalizado') {
            situacao = 'Aberto'
         }

         const arrAddLancamentos = payload.addLancamentos

         for (let i in arrAddLancamentos) {
            let o = {
               forma: arrAddLancamentos[i].forma,
               subGrupo_id: grupo_id,
               conta_id: arrAddLancamentos[i].conta_id,
               dCompetencia: arrAddLancamentos[i].dCompetencia,
               dVencimento: arrAddLancamentos[i].dVencimento,
               historico: arrAddLancamentos[i].historico,
               isConciliado: 0,
               nota: arrAddLancamentos[i].nota,
               ordem_servico_id: ordem_servico_id,
               equipamento_id: equipamento_id,
               parcelaF: arrAddLancamentos[i].parcelaF,
               parcelaI: arrAddLancamentos[i].parcelaI,
               pessoa_id: arrAddLancamentos[i].pessoa_id,
               tipo: tipo,
               valorBase: arrAddLancamentos[i].valorBase,
               valorAcresc: arrAddLancamentos[i].valorAcrescimo,
               valorDesc:
                  arrAddLancamentos[i].valorDesconto > 0
                     ? arrAddLancamentos[i].valorDesconto
                     : arrAddLancamentos[i].valorPrejuizo,
               //valorPrejuizo: arrAddLancamentos[i].valorPrejuizo,
               valorTotal: arrAddLancamentos[i].valorTotal,
               status: status,
               situacao: situacao,
            }

            let model = await Model.create(o, trx ? trx : null)
            await model
               .items()
               .createMany(arrAddLancamentos[i].items, trx ? trx : null)

            listaID.push(model.id)

            /* Status */
            let oStatus = {
               lancamento_id: model.id,
               user_id: auth.user.id,
               motivo:
                  parseInt(ordem_servico_id) > 0
                     ? `Criado O.S. ${ordem_servico_id}`
                     : 'Conta gerada pelo sistema',
               status: 'Bloqueado',
            }
            await ModelStatus.create(oStatus, trx ? trx : null)

            if (
               ordem_servico_status === 'Finalizado' &&
               parseInt(ordem_servico_id) > 0
            ) {
               oStatus = {
                  lancamento_id: model.id,
                  user_id: auth.user.id,
                  motivo: `O.S. ${ordem_servico_id} finalizada`,
                  status,
               }
               await ModelStatus.create(oStatus, trx ? trx : null)
            }
         }

         if (onTrx) {
            await trx.commit()
         }

         let query = {}

         if (onTrx) {
            query = await Model.query().whereIn('id', listaID).fetch()
         }

         return query
      } catch (e) {
         if (onTrx) {
            await trx.rollback()
         }

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
      let nrErro = null
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

   async destroyOS(ordem_servico_id, trx, auth) {
      let nrErro = null
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         const query = await Model.query()
            .where('ordem_servico_id', ordem_servico_id)
            .fetch()

         let arrID = []
         let isError = false

         for (let i in query.rows) {
            let e = query.rows[i]
            let situacao = e.situacao
            arrID.push(e.id)
            if (situacao !== 'Aberto' && situacao !== 'Bloqueado') {
               isError = true
            }
         }

         if (isError) {
            nrErro = -100
            throw { success: false, message: 'Exclusão não autorizada.' }
         }

         const queryDelete = await Model.query()
            .where('ordem_servico_id', ordem_servico_id)
            .transacting(trx ? trx : null)
            .delete()

         await trx.commit()

         return { success: true, message: 'Excluido com sucesso' }
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

   async gerarBoleto(data, auth) {
      let nrErro = null
      try {
         const trx = await Database.beginTransaction()

         delete data['nome']
         delete data['boletos']
         delete data['status_situacao']
         delete data['parcelas']

         let model = await Model.findOrFail(data.id)
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
            .transacting(trx ? trx : null)
            .delete()

         model.merge(data)

         await model.items().createMany(items, trx ? trx : null)

         // Contas (plano de contas)
         const conta = await ModelConta.find(model.conta_id)
         if (!conta) {
         }
         let boletoConfig = await ModelBoletoConfig.findByOrFail(
            'modelo',
            conta.modeloBoleto
         )

         // Boleto
         let nossoNumero = boletoConfig.nossoNumero
         boletoConfig.nossoNumero = nossoNumero + 1
         nossoNumero = boletoConfig.nossoNumero

         console.log(nossoNumero)

         await boletoConfig.save()

         const objBoleto = {
            conta_id: model.conta_id,
            boleto_nota1: '',
            boleto_nota2: '',
            dVencimento: moment(model.dVencimento, 'YYYY-MM-DD').format(
               'YYYY-MM-DD'
            ),
            dCompensacao: null,

            nossoNumero: nossoNumero,
            lancamento_id: model.id,
            pessoa_id: model.pessoa_id,

            valorTotal: model.valorTotal,
            status: 'Aberto',
         }

         const modelBoleto = ModelBoleto.create(objBoleto, trx ? trx : null)

         await model.save(trx ? trx : null)

         await model.load('pessoa')
         let jsonLancamento = model.toJSON()

         const dVenc = model.dVencimento
         objBoleto.pessoa = jsonLancamento.pessoa
         objBoleto.dVencimento = moment(dVenc, 'YYYY-MM-DD').format(
            'DD/MM/YYYY'
         )
         objBoleto.dVencimento2 = moment(dVenc, 'YYYY-MM-DD').format(
            'YYYY-MM-DD'
         )
         objBoleto.valorTotal = objBoleto.valorTotal //.toString().replace('.', ',')
         objBoleto.banco = conta.banco
         objBoleto.agencia = conta.agencia
         objBoleto.agenciaDV = conta.agenciaDV
         objBoleto.contaCorrente = conta.contaCorrente
         objBoleto.contaCorrenteDV = conta.contaCorrenteDV
         objBoleto.convenio = conta.convenio
         objBoleto.pessoa_nome = jsonLancamento.pessoa.nome
         objBoleto.cpfCnpj = jsonLancamento.pessoa.cpfCnpj
         objBoleto.endRua = jsonLancamento.pessoa.endRua
         objBoleto.Numero = '.'
         objBoleto.endBairro = jsonLancamento.pessoa.endBairro
         objBoleto.endComplemento = jsonLancamento.pessoa.endComplemento
         objBoleto.endCidade = jsonLancamento.pessoa.endCidade
         objBoleto.endEstado = jsonLancamento.pessoa.endEstado
         objBoleto.endCep = jsonLancamento.pessoa.endCep

         const boleto = await new Boleto().gerarBoleto([objBoleto])

         if (!boleto.success) {
            throw boleto
         }

         //await trx.rollback()
         await trx.commit()

         await model.load('items')
         await model.load('boletos')

         let json = model.toJSON()

         return json
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

   async getConfig() {}
}

module.exports = Lancamento
