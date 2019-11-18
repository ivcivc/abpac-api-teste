"use strict";
const lodash = require('lodash')

//const Model = use("App/Models/Equipamento");
const Equipamento = use('App/Models/Equipamento')
const Model = use('App/Models/EquipamentoProtecao')
const EquipamentoProtecaoStatus = use('App/Models/EquipamentoProtecaoStatus')

const moment = require('moment')


const Database = use('Database')

class EquipamentoProtecao {

  async add(equipamento_id,protecoes, trx, auth) {

   try {

      if ( protecoes) {
         for (let i=0; i < protecoes.length; i++ ) {
            let item = protecoes[i]
            item.user_id= auth.user.id
            item.equipamento_id= equipamento_id
            const equipamentoProtecao = await Model.create(item, trx ? trx : null);

            // status protecao
            const status = {equipamento_protecao_id: equipamentoProtecao.id, user_id: auth.user.id, motivo: "Inclusão de registro", status: item.status}
            await EquipamentoProtecaoStatus.create(status, trx ? trx : null)

         }
      }

   } catch( e ) {

      throw e

   }


}

async update(equipamento_id, data, trx, auth) {


   try {

      let addStatus = null
      let protecao_id = null
      let protecao = null

      const query = await Model.query()
      .where('equipamento_id', '=', equipamento_id)
      .andWhere('tipo', 'like', data.tipo).fetch()

      if ( query.rows.length > 0 ) {
         protecao_id= query.rows[0].id
      }

      data.user_id = auth.user.id

      if ( protecao_id) {
         protecao = await Model.findOrFail(protecao_id)
         data.id = protecao.id
         data.tipo = protecao.tipo

         let statusAtual = protecao.status
         let updated_at =  moment(protecao.updated_at).format("YYYY-MM-DD h:mm:s")
         let novoUpdated_at= moment(data.updated_at).format("YYYY-MM-DD h:mm:s")

         if ( updated_at !== novoUpdated_at) {
            throw { message: 'Registro alterado por outro usuário.'}
         }

         if ( data.status !== statusAtual ) {
            addStatus = {
               equipamento_protecao_id: protecao.id,
               motivo : `De: ${statusAtual} para: ${data.status}`,
               status: data.status
            }
            if ( data.status === "Removido") {
               addStatus.motivo= addStatus.motivo + ` Data remoção: ${data.dRemocao}`
            }

            protecao.status= data.status
         }

         protecao.merge(data);

         await protecao.save(trx ? trx : null);
      }

      if ( ! protecao_id) {
         protecao = await Model.create(data, trx ? trx : null);
         addStatus = {
            equipamento_protecao_id: protecao.id,
            motivo : `Inclusão do status "${protecao.status}"`,
            status: protecao.status
         }
      }

      if ( addStatus) {
         addStatus.user_id = auth.user.id
         await EquipamentoProtecaoStatus.create(addStatus, trx ? trx : null)
      }

      return protecao

   } catch( e ) {

      throw e

   }
}


async get(ID) {
   try {
     const protecao = await Model.findOrFail(ID);

     return protecao;
   } catch (e) {
     throw e;
   }
 }


async addStatus_DELETAR(data, trx, auth) {
   try {

     if (!trx) {
        trx = await Database.beginTransaction()
     }

     data.user_id = auth.user.id

     const protecao = await Model.findOrFail(data.equipamento_protecao_id);
     protecao.status= data.status
     protecao.save(trx ? trx : null)

     const status = data
     await EquipamentoProtecaoStatus.create(status, trx ? trx : null)

     await trx.commit()

     await protecao.load('equipamentoProtecaoStatuses')

     return protecao;
   } catch (e) {
     await trx.rollback()
     throw e;
   }
 }

}


module.exports = EquipamentoProtecao;
