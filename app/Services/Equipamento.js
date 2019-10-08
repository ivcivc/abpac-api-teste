"use strict";
const lodash = require('lodash')

const Model = use("App/Models/Equipamento");
const EquipamentoStatus = use('App/Models/EquipamentoStatus')

const Database = use('Database')

class Equipamento {
  async update(ID, data, trx) {
    try {
      let equipamento = await Model.findOrFail(ID);

      delete data['status']

      equipamento.merge(data);

      await equipamento.save(trx ? trx : null);

      await equipamento.load('equipamentoStatuses')
      await equipamento.load('pessoa')

      return equipamento;
    } catch (e) {
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

      data.status= "Ativo"
      data.placas= gerarPlacas(data)

      const equipamento = await Model.create(data, trx ? trx : null);

      const status = {equipamento_id: equipamento.id, user_id: auth.user.id, motivo: "Inclusão de Equipamento gerado pelo sistema.", status: "Ativo"}
      await EquipamentoStatus.create(status, trx ? trx : null)

      trx.commit()

      return equipamento;
    } catch (e) {
      await trx.rollback()
      throw e;
    }
  }

  async get(ID) {
    try {
      const equipamento = await Model.findOrFail(ID);

      await equipamento.load('equipamentoStatuses')
      await equipamento.load('pessoa')
      await equipamento.load('categoria')
      //await equipamento.load('ocorrencias')

      return equipamento;
    } catch (e) {
      throw e;
    }
  }

  async index() {
   try {
      const equipamento = await Model.query().fetch();

      return equipamento;
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

     const equipamento = await Model.findOrFail(data.equipamento_id);
     equipamento.status= data.status
     equipamento.save(trx ? trx : null)

     const status = data
     await EquipamentoStatus.create(status, trx ? trx : null)

     trx.commit()

     return equipamento;
   } catch (e) {
     await trx.rollback()
     throw e;
   }
 }



}

module.exports = Equipamento;


const gerarPlacas= (r) => {
   if (!r) return null
   let placas= ''
   if ( lodash.r, 'placa1' ) {
      if ( r.placa1)
         placas= r.placa1.replace(/\W/g,"")
   }
   if ( lodash.r, 'placa2' ) {
      if ( r.placa2)
         placas= placas + '|' + r.placa2.replace(/\W/g,"")
   }
   if ( lodash.r, 'placa3' ) {
      if ( r.placa3)
         placas= placas + '|' + r.placa3.replace(/\W/g,"")
   }
   return placas=='' ? null : placas
}
