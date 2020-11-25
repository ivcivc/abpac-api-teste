'use strict'
const lodash = require('lodash')
const moment = require('moment')
const Model = use('App/Models/Ocorrencia')
const Terceiro = use('App/Models/OcorrenciaTerceiro')
const OcorrenciaStatus = use('App/Models/OcorrenciaStatus')
//const OcorrenciaTerceiroStatus = use("/App/Models/OcorrenciaTerceiroStatus")
const ModelTerceiroStatus = use('App/Models/OcorrenciaTerceiroStatus')

const Database = use('Database')

class Ocorrencia {
   async update(ID, data, trx) {
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         let ocorrencia = await Model.findOrFail(ID)

         let terceiros = null
         if (data.terceiros) {
            terceiros = data.terceiros
         }

         delete data['terceiros']

         ocorrencia.merge(data)

         if (terceiros) {
            if (terceiros.length > 0) {
               for (let i = 0; i < terceiros.length; i++) {
                  if (terceiros[i].id) {
                     const terceiro = await Terceiro.find(terceiros[i].id)
                     terceiro.merge(terceiros[i])
                     await terceiro.save(trx ? trx : null)
                  } else {
                     const terceiro = new Terceiro()
                     terceiro.merge(terceiros[i])
                     await terceiro.save(trx ? trx : null)
                  }
               }
            }
         }

         await ocorrencia.save(trx ? trx : null)

         await ocorrencia.load('pessoa')
         await ocorrencia.load('terceiros')

         await trx.commit()

         return ocorrencia
      } catch (e) {
         await trx.rollback()
         throw {
            message: e.message,
            sqlMessage: e.sqlMessage,
            sqlState: e.sqlState,
            errno: e.errno,
            code: e.code,
         }
      }
   }

   async add(data, trx, auth) {
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         data.status = 'Aberto'

         let terceiros = []
         if (data.terceiros) {
            terceiros = data.terceiros
            delete data['terceiros']
         }

         const ocorrencia = await Model.create(data, trx ? trx : null)

         if (terceiros.length > 0) {
            const terceiroModel = await ocorrencia
               .terceiros()
               .createMany(terceiros, trx ? trx : null)
            for (const key in terceiroModel) {
               const status = {
                  ocorrencia_terceiro_id: terceiroModel[key].id,
                  user_id: auth.user.id,
                  motivo: 'Inclusão de Terceiro',
                  status: 'Aberto',
               }
               //await terceiroModel.statuses().create(status, trx ? trx : null)
               await ModelTerceiroStatus.create(status, trx ? trx : null)
            }
         }

         const status = {
            ocorrencia_id: ocorrencia.id,
            user_id: auth.user.id,
            motivo: 'Inclusão de Ocorrência',
            status: 'Aberto',
         }
         await OcorrenciaStatus.create(status, trx ? trx : null)

         /*await ocorrencia.load('pessoa')
      await ocorrencia.load('equipamento')
      await ocorrencia.load('statuses')
      await ocorrencia.load('terceiros')*/

         await trx.commit()

         const query = await Model.query()
            .with('pessoa')
            .with('equipamento')
            .with('statuses')
            .with('terceiros')
            .with('terceiros.statuses')
            .where('id', '=', ocorrencia.id)
            .fetch()

         return query
      } catch (e) {
         await trx.rollback()
         throw e
      }
   }

   async addTerceiro(data, trx, auth) {
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         const ocorrencia_id = data.ocorrencia_id

         if (!ocorrencia_id) {
            throw { message: 'ID de ocorrência não foi fornecido.' }
         }

         data.status = 'Aberto'

         const ocorrencia = await Model.findOrFail(ocorrencia_id)

         const terceiroModel = await ocorrencia
            .terceiros()
            .create(data, trx ? trx : null)
         // Status terceiro
         const statusTerceiro = {
            ocorrencia_terceiro_id: terceiroModel.id,
            user_id: auth.user.id,
            motivo: 'Inclusão de Terceiro',
            status: 'Aberto',
         }
         await terceiroModel.statuses().create(statusTerceiro, trx ? trx : null)

         await trx.commit()

         return terceiroModel
      } catch (e) {
         await trx.rollback()
         throw e
      }
   }

   async updateTerceiro(ID, data, trx, auth) {
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         const ocorrencia_id = data.ocorrencia_id

         if (!ocorrencia_id) {
            throw { message: 'ID de ocorrência não foi fornecido.' }
         }

         const ocorrencia = await Model.findOrFail(ocorrencia_id)

         const terceiroModel = await Terceiro.findOrFail(ID)
         const dbStatus = terceiroModel.status

         const timestamp = terceiroModel.updated_at
         const update_at_db = moment(timestamp).format()
         const update_at = moment(data.updated_at).format()

         if (update_at_db !== update_at) {
            throw { message: 'Registro alterado por outro usuário.' }
         }

         if (data.status !== dbStatus) {
            const statusTerceiro = {
               ocorrencia_terceiro_id: terceiroModel.id,
               user_id: auth.user.id,
               motivo: 'Mudança de Status',
               status: data.status,
            }
            await terceiroModel
               .statuses()
               .create(statusTerceiro, trx ? trx : null)
         }

         terceiroModel.merge(data)
         // Status terceiro
         //const statusTerceiro= {ocorrencia_terceiro_id: terceiroModel.id, user_id: auth.user.id, motivo: "Alteração de Terceiro", status: data.status}
         //await terceiroModel.statuses().create(statusTerceiro, trx ? trx : null)

         await terceiroModel.save(trx ? trx : null)

         trx.commit()

         return terceiroModel
      } catch (e) {
         await trx.rollback()
         throw e
      }
   }

   async get(ID) {
      try {
         const ocorrencia = await Model.findOrFail(ID)

         await ocorrencia.load('pessoa')
         await ocorrencia.load('equipamento')
         await ocorrencia.load('terceiros')

         return ocorrencia
      } catch (e) {
         throw e
      }
   }

   async index() {
      try {
         const ocorrencia = await Model.query().with('terceiros').fetch()

         return ocorrencia
      } catch (e) {
         throw e
      }
   }

   async addStatus(data, trx, auth) {
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         data.user_id = auth.user.id

         const ocorrencia = await Model.findOrFail(data.ocorrencia_id)
         ocorrencia.status = data.status
         ocorrencia.save(trx ? trx : null)

         const status = data
         await OcorrenciaStatus.create(status, trx ? trx : null)

         await trx.commit()

         return ocorrencia
      } catch (e) {
         await trx.rollback()
         throw e
      }
   }

   async destroyTerceiro(ID, trx, auth) {
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         const terceiro = await Terceiro.findOrFail(ID)

         await terceiro.statuses().where('ocorrencia_terceiro_id', ID).delete()

         await terceiro.delete(trx)

         await trx.commit()

         return terceiro
      } catch (e) {
         await trx.rollback()
         throw e
      }
   }

   async localizar(filtro, trx, auth) {
      try {
         let field_value = filtro.field_value
         let field_name = filtro.field_name

         console.log('filtro ', filtro)
         console.log('field ', field_name)

         let query = Database.select([
            'ocorrencias.id',
            'ocorrencias.pessoa_id',
            'ocorrencias.qualPlaca',
            'ocorrencias.equipamento_id',
            'ocorrencias.dEvento',
            'ocorrencias.status',
            'equipamentos.placa1',
            'equipamentos.marca1',
            'equipamentos.modelo1',
            'equipamentos.placa2',
            'equipamentos.marca2',
            'equipamentos.modelo2',
            'equipamentos.placa3',
            'equipamentos.marca3',
            'equipamentos.modelo3',
            'pessoas.nome as pessoa_nome',
            'pessoas.cpfCnpj',
            'pessoas.tipo as pessoa_tipo',
         ])
            .from('ocorrencias')
            .innerJoin(
               'equipamentos',
               'ocorrencias.equipamento_id',
               'equipamentos.id'
            )
            .innerJoin('pessoas', 'ocorrencias.pessoa_id', 'pessoas.id')

         // await Database.select('*').from('ocorrencias').innerJoin('equipamentos','ocorrencias.equipamento_id','equipamentos.id').where('equipamentos.placas','like', '%H%')

         if (field_name === 'placa') {
            await query.where(
               'equipamentos.placas',
               'like',
               '%' + field_value + '%'
            )
         }

         if (field_name === 'idOcorrencia') {
            await query.where('ocorrencias.id', field_value)
         }

         if (field_name === 'associado') {
            await query.where('pessoas.nome', 'like', '%' + field_value + '%')
         }
         let objeto = await query.first()

         objeto.placa = objeto[`${'placa' + objeto.qualPlaca}`]
         objeto.marca = objeto[`${'marca' + objeto.qualPlaca}`]
         objeto.modelo = objeto[`${'modelo' + objeto.qualPlaca}`]
         objeto.anoF = objeto[`${'anoF' + objeto.qualPlaca}`]
         objeto.ModeloF = objeto[`${'ModeloF' + objeto.qualPlaca}`]
         objeto.chassi = objeto[`${'chassi' + objeto.qualPlaca}`]

         return objeto
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

   /*
   async addStatusTerceiro(data, trx, auth) {
      try {

         if (!trx) {
            trx = await Database.beginTransaction()
         }

         data.user_id = auth.user.id

         const ocorrenciaTerceiroStatus = await OcorrenciaTerceiroStatus.findOrFail(data.ocorrencia_terceiro_id);
         ocorrenciaTerceiroStatus.status= data.status
         ocorrenciaTerceiroStatus.save(trx ? trx : null)

         const status = data
         await ocorrenciaTerceiroStatus.create(status, trx ? trx : null)

         trx.commit()

         return ocorrenciaTerceiroStatus;
      } catch (e) {
         await trx.rollback()
         throw e;
      }
   }
*/
}

module.exports = Ocorrencia

