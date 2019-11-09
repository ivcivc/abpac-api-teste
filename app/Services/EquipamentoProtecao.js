"use strict";
const lodash = require('lodash')

//const Model = use("App/Models/Equipamento");
const Equipamento = use('App/Models/Equipamento')
const Model = use('App/Models/EquipamentoProtecao')
const EquipamentoProtecaoStatus = use('App/Models/EquipamentoProtecaoStatus')


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
      let oData = {}
      let key= null

      for ( key in data){
         oData[data[key].tipo]= data[key]
      }

      if ( oData['Localizador']) {
         delete oData['Localizador'].id
         delete oData['Localizador'].status

         const query = await Model.query()
            .where('equipamento_id', '=', equipamento_id)
            .andWhere('tipo', 'like', 'Localizador')
            .transacting(trx)
            .update(oData['Localizador'])
         if ( query > 0 ) {
            delete oData['Localizador']
         }

      }

      if ( oData['Bloqueador']) {
         delete oData['Bloqueador'].id
         delete oData['Bloqueador'].status

         const query = await Model.query()
            .where('equipamento_id', '=', equipamento_id)
            .andWhere('tipo', 'like', 'Bloqueador')
            .transacting(trx)
            .update(oData['Bloqueador'])

         if ( query > 0 ) {
            delete oData['Bloqueador']
         }
      }

      // Adicionar registro
      if ( ! lodash.isEmpty(oData) ) {
         let arr= []
         Object.keys(oData).forEach(e => {
            let reg= oData[e]
            delete reg['id']
            delete reg['status']
            arr.push( reg )
         } )

         await this.add(arr, trx, auth)
      }



   } catch( e ) {

      throw e

   }
}

async addStatus(data, trx, auth) {
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
