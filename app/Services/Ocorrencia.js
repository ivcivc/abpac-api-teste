"use strict";
const lodash = require('lodash')

const Model = use("App/Models/Ocorrencia");
const Terceiro = use("App/Models/OcorrenciaTerceiro")
const OcorrenciaStatus = use('App/Models/OcorrenciaStatus')


const Database = use('Database')

class Ocorrencia {
  async update(ID, data, trx) {
    try {

      if (!trx) {
         trx = await Database.beginTransaction()
      }

      let ocorrencia = await Model.findOrFail(ID);

      let terceiros= null
      if ( data.terceiros) {
         terceiros= data.terceiros
      }

      delete data['terceiros']

      ocorrencia.merge(data);

      if ( terceiros) {
         if ( terceiros.length > 0) {
            for ( let i=0; i < terceiros.length; i++) {
               if ( terceiros[i].id ) {
                  const terceiro = await Terceiro.find(terceiros[i].id)
                  terceiro.merge( terceiros[i])
                  await terceiro.save(trx ? trx : null)
               } else {
                  const terceiro = new Terceiro()
                  terceiro.merge( terceiros[i])
                  await terceiro.save(trx ? trx : null)
               }

            }
         }
      }

      await ocorrencia.save(trx ? trx : null);

      await ocorrencia.load('pessoa')

      trx.commit()

      return ocorrencia;
    } catch (e) {
      await trx.rollback()
      throw {
        message: e.message,
        sqlMessage: e.sqlMessage,
        sqlState: e.sqlState,
        errno: e.errno,
        code: e.code
      };
    }
  }

  async add(data, trx, auth) {
    try {

      if (!trx) {
         trx = await Database.beginTransaction()
      }

      data.status= "Aberto"

      const ocorrencia = await Model.create(data, trx ? trx : null);

      if ( data.terceiros) {
         await ocorrencia.terceiros().attach(data.terceiros)
      }

      const status = {ocorrencia_id: ocorrencia.id, user_id: auth.user.id, motivo: "Inclusão de Ocorrência gerado pelo sistema.", status: "Aberto"}
      await OcorrenciaStatus.create(status, trx ? trx : null)

      trx.commit()

      return ocorrencia;
    } catch (e) {
      await trx.rollback()
      throw e;
    }
  }

  async get(ID) {
    try {
      const ocorrencia = await Model.findOrFail(ID);

      await ocorrencia.load('pessoa')
      await ocorrencia.load('equipamento')
      await ocorrencia.load('terceiros')

      return ocorrencia;
    } catch (e) {
      throw e;
    }
  }

  async index() {
   try {
      const ocorrencia = await Model.query().with('terceiros').fetch();

      return ocorrencia;
    } catch (e) {
      throw e;
    }
  }

  async addStatus(data, trx, auth) {
   try {

     if (!trx) {
        trx = await Database.beginTransaction()
     }

     data.user_id = auth.user.id

     const ocorrencia = await Model.findOrFail(data.ocorrencia_id);
     ocorrencia.status= data.status
     ocorrencia.save(trx ? trx : null)

     const status = data
     await OcorrenciaStatus.create(status, trx ? trx : null)

     trx.commit()

     return ocorrencia;
   } catch (e) {
     await trx.rollback()
     throw e;
   }
 }



}

module.exports = Ocorrencia;

