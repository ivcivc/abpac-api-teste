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
         await model.load('boletos')

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

         let query = null //.fetch()

         if (modulo === 'todos') {
            if (dVencInicio) {
               query = await Model.query()
                  .with('pessoa')
                  .whereBetween('dVencimento', [
                     dVencInicio.substr(0, 10),
                     dVencFim.substr(0, 10),
                  ])
                  .whereNot({ situacao: 'Bloqueado' })
                  .fetch()
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

         if (moment(model.dVencimento).isAfter(moment())) {
            // moment(model.dVencimento) < moment()
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
               tag: 'IC',
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
}

module.exports = Lancamento
