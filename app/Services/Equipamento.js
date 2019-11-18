"use strict";
const lodash = require('lodash')

const Model = use("App/Models/Equipamento");
const EquipamentoStatus = use('App/Models/EquipamentoStatus')
const EquipamentoProtecao = use('App/Models/EquipamentoProtecao')
const EquipamentoProtecaoService = use('App/Services/EquipamentoProtecao')
const ModelOcorrencia = use("App/Models/Ocorrencia");
const EquipamentoBeneficioService = use("App/Services/EquipamentoBeneficio")


const Database = use('Database')

class Equipamento {
  async update(ID, data, trx, auth) {

    let showNewTrx= false

    try {

      if (!trx) {
         showNewTrx= true
         trx = await Database.beginTransaction()
      }

      let equipamento = await Model.findOrFail(ID);
      //let protecoes= data['protecoes']

      delete data['status']
      delete data['protecoes']

      if ( lodash.has(data, 'placa1') && lodash.has(data, 'placa2') && lodash.has(data, 'placa3')) {
         data.placas= gerarPlacas(data)
      }

      equipamento.merge(data);

      await equipamento.save(trx ? trx : null);

      // Protecoes (localizador e bloqueador)
      /*if ( protecoes) {
         for (let i=0; i < protecoes.length; i++ ) {
            let item = protecoes[i]
            item.equipamento_id= equipamento.id
        }

        const protecaoServ = await new EquipamentoProtecaoService().add( equipamento.id,protecoes, trx, auth)
        //const protecaoServ = await new EquipamentoProtecaoService().update(equipamento.id, protecoes, trx, auth)
        let a=1
      }*/

      if ( showNewTrx) {
         await trx.commit()
      }

      await equipamento.load('equipamentoStatuses')
      await equipamento.load('pessoa')
      await equipamento.load('equipamentoProtecoes')

      return equipamento;
    } catch (e) {
      if ( showNewTrx) {
         await trx.rollback()
      }

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
   let showNewTrx= false

    try {
       console.log('metodo add')

      let protecoes = data.protecoes
      let beneficios= data.beneficios

      delete data['protecoes']
      delete data['beneficios']

      if (!trx) {
         showNewTrx= true
         trx = await Database.beginTransaction()
      }

      data.status= "Ativo"
      data.placas= gerarPlacas(data)

      const equipamento = await Model.create(data, trx ? trx : null);
      equipamento.idPrincipal= equipamento.id

      const status = {equipamento_id: equipamento.id, user_id: auth.user.id, motivo: "Inclusão de Equipamento gerado pelo sistema.", status: "Ativo"}
      await EquipamentoStatus.create(status, trx ? trx : null)

      // Protecoes (localizador e bloqueador)
      if ( protecoes) {
         for (let i=0; i < protecoes.length; i++ ) {
            let item = protecoes[i]
            item.equipamento_id= equipamento.id
        }

        await new EquipamentoProtecaoService().add(equipamento.id, protecoes, trx, auth)

      }

      if ( beneficios) {
         for (const key in beneficios) {
            if (beneficios.hasOwnProperty(key)) {
               const element = beneficios[key];
               element.equipamento_id= equipamento.id
               await new EquipamentoBeneficioService().add(element, trx, auth)
            }
         }
      }

      if ( showNewTrx) {
         await trx.commit()
      }

      await equipamento.load('equipamentoProtecoes')

      return equipamento;
    } catch (e) {
       if ( showNewTrx) {
          await trx.rollback()
       }

      throw e;
    }
  }


  async endosso(data, trx, auth) {
   try {

     if (!trx) {
        trx = await Database.beginTransaction()
     }

     let equipamentoAdd= null

     const id= data.endosso.id
     const tipo_endosso= data.endosso.tipo_endosso

     let equipamento = await Model.findOrFail(id)

     if ( equipamento.status !== 'Ativo') {
        throw { message: "Status não permitido.", type: false }
     }

     let oEquipamento = {}
     oEquipamento.status= "Endossado"
     oEquipamento.idPrincipal= equipamento.idPrincipal
     if ( ! oEquipamento.idPrincipal ) {
      oEquipamento.idPrincipal= equipamento.id
     }
     oEquipamento.idFilho=''


     if ( tipo_endosso === 'categoria-rateio') {
         let novoEquipamento= equipamento.toJSON()
         delete novoEquipamento['id']
         novoEquipamento.idPai= equipamento.id
         novoEquipamento.idFilho= null
         novoEquipamento.idPrincipal= oEquipamento.idPrincipal
         novoEquipamento.status= "Ativo"

         novoEquipamento.categoria_id= data.categoria_id
         novoEquipamento.tipoEndosso =  "categoria-rateio"

         // Adincionar novo equipamento (endosso)
         equipamentoAdd = await Model.create(novoEquipamento, trx ? trx : null);
         oEquipamento.idFilho= equipamentoAdd.id

         equipamento.merge(oEquipamento);
         equipamento.save(trx ? trx : null)

         // status equipamento
         let status = {equipamento_id: equipamento.id, user_id: auth.user.id, motivo: "Endosso de alteração de categoria de rateio", status: "Endossado"}
         await EquipamentoStatus.create(status, trx ? trx : null)

         // status novo equipamento (endosso)
         status = {equipamento_id: equipamentoAdd.id, user_id: auth.user.id, motivo: "Endosso de alteração de categoria de rateio", status: "Ativo"}
         await EquipamentoStatus.create(status, trx ? trx : null)
     }


     if ( tipo_endosso === 'acerto-adesao') {
        let novoEquipamento= equipamento.toJSON()
        delete novoEquipamento['id']
        novoEquipamento.idPai= equipamento.id
        novoEquipamento.idFilho= null
        novoEquipamento.idPrincipal= oEquipamento.idPrincipal
        novoEquipamento.status= "Ativo"

        novoEquipamento.dAdesao= data.dAdesao
        novoEquipamento.tipoEndosso = 'acerto-adesao'

        // Adincionar novo equipamento (endosso)
        equipamentoAdd = await Model.create(novoEquipamento, trx ? trx : null);
        oEquipamento.idFilho= equipamentoAdd.id

        equipamento.merge(oEquipamento);
        equipamento.save(trx ? trx : null)

        // status equipamento
        let status = {equipamento_id: equipamento.id, user_id: auth.user.id, motivo: "Endosso de alteração de categoria de rateio", status: "Endossado"}
        await EquipamentoStatus.create(status, trx ? trx : null)

        // status novo equipamento (endosso)
        status = {equipamento_id: equipamentoAdd.id, user_id: auth.user.id, motivo: "Endosso de alteração de categoria de rateio", status: "Ativo"}
        await EquipamentoStatus.create(status, trx ? trx : null)
    }

    // Acerto de equipamento
    if ( tipo_endosso === 'acerto-equipamento') {
        let novoEquipamento= equipamento.toJSON()
        delete novoEquipamento['id']
        novoEquipamento.idPai= equipamento.id
        novoEquipamento.idFilho= null
        novoEquipamento.idPrincipal= oEquipamento.idPrincipal
        novoEquipamento.status= "Ativo"

        novoEquipamento.tipoEndosso = 'acerto-equipamento'

        novoEquipamento.especie1 = data.especie1;
        novoEquipamento.marca1 = data.marca1;
        novoEquipamento.modelo1 = data.modelo1;
        novoEquipamento.anoF1 = data.anoF1;
        novoEquipamento.modeloF1 = data.modeloF1;
        novoEquipamento.placa1 = data.placa1;
        novoEquipamento.chassi1 = data.chassi1;
        novoEquipamento.renavam1 = data.renavam1;

        novoEquipamento.especie2 = data.especie2;
        novoEquipamento.marca2 = data.marca2;
        novoEquipamento.modelo2 = data.modeloF2;
        novoEquipamento.anoF2 = data.anoF2;
        novoEquipamento.modeloF2 = data.modeloF2;
        novoEquipamento.placa2 = data.placa2;
        novoEquipamento.chassi2 = data.chassi2;
        novoEquipamento.renavam2 = data.renavam2;

        novoEquipamento.especie3 = data.especie3;
        novoEquipamento.marca3 = data.marca3;
        novoEquipamento.modelo3 = data.modeloF3;
        novoEquipamento.anoF3 = data.anoF3;
        novoEquipamento.modeloF3 = data.modeloF3;
        novoEquipamento.placa3 = data.placa3;
        novoEquipamento.chassi3 = data.chassi3;
        novoEquipamento.renavam3 = data.renavam3;

        novoEquipamento.placas= gerarPlacas(data)


        // Adincionar novo equipamento (endosso)
        equipamentoAdd = await Model.create(novoEquipamento, trx ? trx : null);
        oEquipamento.idFilho= equipamentoAdd.id

        equipamento.merge(oEquipamento);
        equipamento.save(trx ? trx : null)

        // status equipamento
        let status = {equipamento_id: equipamento.id, user_id: auth.user.id, motivo: "Endosso de alteração de categoria de rateio", status: "Endossado"}
        await EquipamentoStatus.create(status, trx ? trx : null)

        // status novo equipamento (endosso)
        status = {equipamento_id: equipamentoAdd.id, user_id: auth.user.id, motivo: "Endosso de alteração de categoria de rateio", status: "Ativo"}
        await EquipamentoStatus.create(status, trx ? trx : null)
    }

    // substituição de equipamento
    if ( tipo_endosso === 'substituicao-equipamento') {
      let novoEquipamento= equipamento.toJSON()
      delete novoEquipamento['id']
      novoEquipamento.idPai= equipamento.id
      novoEquipamento.idFilho= null
      novoEquipamento.idPrincipal= oEquipamento.idPrincipal
      novoEquipamento.status= "Ativo"

      novoEquipamento.tipoEndosso = 'substituicao-equipamento'

      novoEquipamento.especie1 = data.especie1;
      novoEquipamento.marca1 = data.marca1;
      novoEquipamento.modelo1 = data.modelo1;
      novoEquipamento.anoF1 = data.anoF1;
      novoEquipamento.modeloF1 = data.modeloF1;
      novoEquipamento.placa1 = data.placa1;
      novoEquipamento.chassi1 = data.chassi1;
      novoEquipamento.renavam1 = data.renavam1;

      novoEquipamento.especie2 = data.especie2;
      novoEquipamento.marca2 = data.marca2;
      novoEquipamento.modelo2 = data.modeloF2;
      novoEquipamento.anoF2 = data.anoF2;
      novoEquipamento.modeloF2 = data.modeloF2;
      novoEquipamento.placa2 = data.placa2;
      novoEquipamento.chassi2 = data.chassi2;
      novoEquipamento.renavam2 = data.renavam2;

      novoEquipamento.especie3 = data.especie3;
      novoEquipamento.marca3 = data.marca3;
      novoEquipamento.modelo3 = data.modeloF3;
      novoEquipamento.anoF3 = data.anoF3;
      novoEquipamento.modeloF3 = data.modeloF3;
      novoEquipamento.placa3 = data.placa3;
      novoEquipamento.chassi3 = data.chassi3;
      novoEquipamento.renavam3 = data.renavam3;

      novoEquipamento.placas= gerarPlacas(data)

      // Adincionar novo equipamento (endosso)
      equipamentoAdd = await Model.create(novoEquipamento, trx ? trx : null);
      oEquipamento.idFilho= equipamentoAdd.id

      equipamento.merge(oEquipamento);
      equipamento.save(trx ? trx : null)

      // status equipamento
      let status = {equipamento_id: equipamento.id, user_id: auth.user.id, motivo: "Endosso de alteração de categoria de rateio", status: "Endossado"}
      await EquipamentoStatus.create(status, trx ? trx : null)

      // status novo equipamento (endosso)
      status = {equipamento_id: equipamentoAdd.id, user_id: auth.user.id, motivo: "Endosso de alteração de categoria de rateio", status: "Ativo"}
      await EquipamentoStatus.create(status, trx ? trx : null)
    }


    // Ocorrencia  - Alterar ID do equipamento da ocorrencia para os equipamentos endossados - exceto para substituição de equipamento.
    if ( tipo_endosso !== 'substituicao-equipamento') {

         await ModelOcorrencia
            .query()
            .where('equipamento_id', equipamento.id)
            .transacting(trx ? trx : null)
            .update({ equipamento_id: equipamentoAdd.id })
    }

    await trx.commit()

    await equipamentoAdd.load('equipamentoProtecoes')

     return equipamentoAdd;
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
      await equipamento.load('equipamentoProtecoes')
      await equipamento.load('equipamentoBeneficios')

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

     await trx.commit()

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
