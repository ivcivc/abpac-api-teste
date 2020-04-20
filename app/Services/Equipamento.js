"use strict";
const lodash = require('lodash')

const Model = use("App/Models/Equipamento");
const EquipamentoStatus = use('App/Models/EquipamentoStatus')
const EquipamentoProtecao = use('App/Models/EquipamentoProtecao')
const EquipamentoProtecaoService = use('App/Services/EquipamentoProtecao')
const ModelOcorrencia = use("App/Models/Ocorrencia");
const EquipamentoBeneficioService = use("App/Services/EquipamentoBeneficio")
const EquipamentoBeneficio = use("App/Models/EquipamentoBeneficio")

const FileConfig = use('App/Models/FileConfig')
const Galeria = use('App/Models/File')

const Database = use('Database')

class Equipamento {
  async update(ID, data, trx, auth) {

    let showNewTrx= false

    try {

      if (!trx) {
         showNewTrx= true
         trx = await Database.beginTransaction()
      }

       if ( await this.isDuplicidadePlaca(ID, data.placa1)) {
          throw { message: 'Placa em duplicidade.', code: "666"}
       }

      let equipamento = await Model.findOrFail(ID);
      //let protecoes= data['protecoes']

      delete data['status']
      delete data['protecoes']
      delete data['categoria']

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

       if ( await  this.isDuplicidadePlaca(null, data.placa1)) {
          throw { message: 'Placa em duplicidade.', code: "666"}
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

       const fileConfig = await FileConfig.query().where('modulo', "like", "Equipamento").fetch()

       for ( const i in fileConfig.rows) {
          const payload= {
             descricao: fileConfig.rows[i].descricao,
             modulo: fileConfig.rows[i].modulo,
             idParent: equipamento.id,
             pessoa_id: equipamento.pessoa_id,
             status: "Pendente" }
          const model = await Galeria.create(payload, trx)
       }

      if ( showNewTrx) {
         await trx.commit()
      }

      await equipamento.load('equipamentoStatuses')
      await equipamento.load('pessoa')
      await equipamento.load('equipamentoProtecoes')
      await equipamento.load('categoria')

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

      if ( data.placa1 ) {
         data.placa1= data.placa1.replace("-", "")
      }
      if ( data.placa2 ) {
         data.placa2= data.placa2.replace("-", "")
      }
      if ( data.placa3 ) {
         data.placa3= data.placa3.replace("-", "")
      }

     const id= data.endosso.id
     const tipo_endosso= data.endosso.tipo_endosso

     let equipamento = await Model.findOrFail(id)

     if ( equipamento.status !== 'Ativo') {
        if ( lodash.isEmpty(equipamento.idParent) && equipamento.status === 'Inativo') {
           // permitir endosso de reativação (tornar ativo).
        } else {
           throw { message: "Status não permitido.", type: false }
        }

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
         novoEquipamento.tipoEndosso =  "Alteração de categoria de rateio"

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
        novoEquipamento.tipoEndosso = 'Acerto na data de adesão'

        // Adincionar novo equipamento (endosso)
        equipamentoAdd = await Model.create(novoEquipamento, trx ? trx : null);
        oEquipamento.idFilho= equipamentoAdd.id

        equipamento.merge(oEquipamento);
        equipamento.save(trx ? trx : null)

        // status equipamento
        let status = {equipamento_id: equipamento.id, user_id: auth.user.id, motivo: "Endosso de acerto na data de adesão", status: "Endossado"}
        await EquipamentoStatus.create(status, trx ? trx : null)

        // status novo equipamento (endosso)
        status = {equipamento_id: equipamentoAdd.id, user_id: auth.user.id, motivo: "Endosso de acerto na data de adesão", status: "Ativo"}
        await EquipamentoStatus.create(status, trx ? trx : null)
    }

    // Acerto de equipamento
    if ( tipo_endosso === 'acerto-equipamento') {

       if ( await this.isDuplicidadePlaca(equipamento.id, data.placa1)) {
          throw { message: 'Placa em duplicidade.', code: "666"}
       }

        let novoEquipamento= equipamento.toJSON()
        delete novoEquipamento['id']
        novoEquipamento.idPai= equipamento.id
        novoEquipamento.idFilho= null
        novoEquipamento.idPrincipal= oEquipamento.idPrincipal
        novoEquipamento.status= "Ativo"

        novoEquipamento.tipoEndosso = 'Acerto nos dados do equipamento'

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


        // Adicionar novo equipamento (endosso)
        equipamentoAdd = await Model.create(novoEquipamento, trx ? trx : null);
        oEquipamento.idFilho= equipamentoAdd.id

        equipamento.merge(oEquipamento);
        equipamento.save(trx ? trx : null)

        // status equipamento
        let status = {equipamento_id: equipamento.id, user_id: auth.user.id, motivo: "Endosso de acerto nos dados do equipamento", status: "Endossado"}
        await EquipamentoStatus.create(status, trx ? trx : null)

        // status novo equipamento (endosso)
        status = {equipamento_id: equipamentoAdd.id, user_id: auth.user.id, motivo: "Endosso de acerto nos dados do equipamento", status: "Ativo"}
        await EquipamentoStatus.create(status, trx ? trx : null)
    }

    // Valor de Mercado
      if ( tipo_endosso === 'acerto-valorMercado') {
         let novoEquipamento= equipamento.toJSON()
         delete novoEquipamento['id']
         novoEquipamento.idPai= equipamento.id
         novoEquipamento.idFilho= null
         novoEquipamento.idPrincipal= oEquipamento.idPrincipal
         novoEquipamento.status= "Ativo"

         novoEquipamento.valorMercado1= data.valorMercado
         novoEquipamento.tipoEndosso =  "Alteração do Valor de Mercado"

         // Adincionar novo equipamento (endosso)
         equipamentoAdd = await Model.create(novoEquipamento, trx ? trx : null);
         oEquipamento.idFilho= equipamentoAdd.id

         equipamento.merge(oEquipamento);
         equipamento.save(trx ? trx : null)

         // status equipamento
         let status = {equipamento_id: equipamento.id, user_id: auth.user.id, motivo: "Endosso de alteração do Valor de Mercado", status: "Endossado"}
         await EquipamentoStatus.create(status, trx ? trx : null)

         // status novo equipamento (endosso)
         status = {equipamento_id: equipamentoAdd.id, user_id: auth.user.id, motivo: "Endosso de alteração do Valor de Mercado", status: "Ativo"}
         await EquipamentoStatus.create(status, trx ? trx : null)
      }
    // Fim Valor de Mercado

      // Baixa (inativação)
      if ( tipo_endosso === 'baixa') {
         let novoEquipamento= equipamento.toJSON()
         delete novoEquipamento['id']
         novoEquipamento.idPai= equipamento.id
         novoEquipamento.idFilho= null
         novoEquipamento.idPrincipal= oEquipamento.idPrincipal
         novoEquipamento.status= "Inativo"

         //novoEquipamento.valorMercado1= data.valorMercado
         novoEquipamento.tipoEndosso =  "Baixa do Equipamento"

         // Adincionar novo equipamento (endosso)
         equipamentoAdd = await Model.create(novoEquipamento, trx ? trx : null);
         oEquipamento.idFilho= equipamentoAdd.id

         equipamento.merge(oEquipamento);
         equipamento.save(trx ? trx : null)

         // status equipamento
         let motivo = lodash.isEmpty(data.motivo) ? "Endosso de Baixa do Equipamento" : data.motivo
         let status = {equipamento_id: equipamento.id, user_id: auth.user.id, motivo: motivo, status: "Endossado"}
         await EquipamentoStatus.create(status, trx ? trx : null)

         // status novo equipamento (endosso)
         status = {equipamento_id: equipamentoAdd.id, user_id: auth.user.id, motivo: motivo, status: "Inativo"}
         await EquipamentoStatus.create(status, trx ? trx : null)
      }
      // Baixa (inativação)

      // Reativar (tornar ativo)
      if ( tipo_endosso === 'reativacao') {
         let novoEquipamento= equipamento.toJSON()
         delete novoEquipamento['id']
         novoEquipamento.idPai= equipamento.id
         novoEquipamento.idFilho= null
         novoEquipamento.idPrincipal= oEquipamento.idPrincipal
         novoEquipamento.status= "Ativo"

         //novoEquipamento.valorMercado1= data.valorMercado
         novoEquipamento.tipoEndosso =  "Reativação do Equipamento"

         // Adincionar novo equipamento (endosso)
         equipamentoAdd = await Model.create(novoEquipamento, trx ? trx : null);
         oEquipamento.idFilho= equipamentoAdd.id

         equipamento.merge(oEquipamento);
         equipamento.save(trx ? trx : null)

         // status equipamento
         let motivo = lodash.isEmpty(data.motivo) ? "Endosso de Reativação do Equipamento" : data.motivo
         let status = {equipamento_id: equipamento.id, user_id: auth.user.id, motivo: motivo, status: "Endossado"}
         await EquipamentoStatus.create(status, trx ? trx : null)

         // status novo equipamento (endosso)
         status = {equipamento_id: equipamentoAdd.id, user_id: auth.user.id, motivo: motivo, status: "Ativo"}
         await EquipamentoStatus.create(status, trx ? trx : null)
      }
      // Fim reativação


    // substituição de equipamento
    if ( tipo_endosso === 'substituicao-equipamento') {

       if ( await this.isDuplicidadePlaca(equipamento.id, data.placa1)) {
          throw { message: 'Placa em duplicidade.', code: "666"}
       }

      let novoEquipamento= equipamento.toJSON()
      delete novoEquipamento['id']
      novoEquipamento.idPai= equipamento.id
      novoEquipamento.idFilho= null
      novoEquipamento.idPrincipal= oEquipamento.idPrincipal
      novoEquipamento.status= "Ativo"

      novoEquipamento.categoria_id= data.categoria_id

      novoEquipamento.tipoEndosso = 'Substituição de equipamento'

      novoEquipamento.especie1 = data.especie1;
      novoEquipamento.valorMercado1= data.valorMercado1
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
      let status = {equipamento_id: equipamento.id, user_id: auth.user.id, motivo: "Endosso de substituição de equipamento", status: "Endossado"}
      await EquipamentoStatus.create(status, trx ? trx : null)

      // status novo equipamento (endosso)
      status = {equipamento_id: equipamentoAdd.id, user_id: auth.user.id, motivo: "Endosso de substituição de equipamento", status: "Ativo"}
      await EquipamentoStatus.create(status, trx ? trx : null)

      // Beneficios - copiar para o atual
      const queryBeneficios = await EquipamentoBeneficio.query().where('equipamento_id', "like", equipamento.id).fetch()

       for ( let i in queryBeneficios.rows) {
          let r= queryBeneficios.rows[i]
          let registro= {
             dInicio: new Date(), equipamento_id: equipamentoAdd.id,
             beneficio_id: r.beneficio_id, status: r.status, obs: r.obs
          }
          //r.equipamento_id= novoEquipamento.equipamento_id
          await new EquipamentoBeneficioService().add(registro, trx, auth)
       }


      /*if ( lodash.has(data, 'beneficios')) {
               // Transferir beneficios para o equipamento atual (endosso)
            //*await EquipamentoBeneficio
            //   .query()
           //    .where('equipamento_id', equipamento.id)
           //    .transacting(trx ? trx : null)
           //    .update({ equipamento_id: equipamentoAdd.id })

         if ( data.beneficios) {
            for (const key in data.beneficios) {
               if (data.beneficios.hasOwnProperty(key)) {
                  const element = data.beneficios[key];
                  element.equipamento_id= equipamentoAdd.id
                  await new EquipamentoBeneficioService().add(element, trx, auth)
               }
            }
         }

      }*/

      if ( lodash.has(data, 'protecoes')) {
         // Transferir beneficios para o equipamento atual (endosso)
         /*await EquipamentoProtecao
            .query()
            .where('equipamento_id', equipamento.id)
            .transacting(trx ? trx : null)
            .update({ equipamento_id: equipamentoAdd.id })*/
         const protecaoServ = await new EquipamentoProtecaoService().add( equipamentoAdd.id,data.protecoes, trx, auth)

      }

    }


    // Ocorrencia  - Alterar ID do equipamento da ocorrencia para os equipamentos endossados - exceto para substituição de equipamento.
    if ( tipo_endosso !== 'substituicao-equipamento') {

         await ModelOcorrencia
            .query()
            .where('equipamento_id', equipamento.id)
            .transacting(trx ? trx : null)
            .update({ equipamento_id: equipamentoAdd.id })

         // Transferir beneficios para o equipamento atual (endosso)
         await EquipamentoProtecao
            .query()
            .where('equipamento_id', equipamento.id)
            .transacting(trx ? trx : null)
            .update({ equipamento_id: equipamentoAdd.id })

         // Transferir Proteção (bloequeador e Localizador) para o equipamento atual (endosso)
         await EquipamentoBeneficio
            .query()
            .where('equipamento_id', equipamento.id)
            .transacting(trx ? trx : null)
            .update({ equipamento_id: equipamentoAdd.id })
    }

    await trx.commit()

    await equipamentoAdd.load('equipamentoProtecoes')
    await equipamentoAdd.load('equipamentoStatuses')
    await equipamentoAdd.load('pessoa')
    await equipamentoAdd.load('categoria')
    await equipamentoAdd.load('equipamentoBeneficios')
    await equipamentoAdd.load('ocorrencias')

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

  async getEndossos(ID) {
      try {
         const query = await Model.query()
            .where('idPrincipal', ID).orderBy('ID', 'desc')
            .with('pessoa')
            .with('categoria')
            .with('equipamentoProtecoes')
            .with('equipamentoBeneficios')
            .with('equipamentoStatuses')
            .with('equipamentoStatuses.user')
            .fetch()

         /*await equipamento.load('equipamentoStatuses')
         await equipamento.load('pessoa')
         await equipamento.load('categoria')
         await equipamento.load('equipamentoProtecoes')
         await equipamento.load('equipamentoBeneficios')*/

         //await equipamento.load('ocorrencias')

         return query;
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

  async isDuplicidadePlaca(id, placa) {

     const query = await Model.query().where('placa1', "like", placa).where("status", "like", "Ativo").fetch()

     placa= placa.replace('-','')

     let recno = query.rows.length

     if ( recno === 0 ) {
        return false
     }

     if ( ! id ) {
        return true
     }

     let isOk= true

     for ( let i in query.rows) {
        if ( query.rows[i].id === parseInt(id) ) {
           isOk= false
        }
     }

     return isOk


  }

  async buscarProtecoes(payload) {

      try {

         let status = !payload.status ? null : payload.status.split(',')
         let isSemProcecao= !payload.isSemProcecao ? false : true

         let query = null

         if ( isSemProcecao ) {

            const query = await Model.query()
               .with('pessoa')
               .with('equipamentoProtecoes')
               .setHidden(['idPai'])
               .where('status', 'Ativo')
               .fetch()

            let arr= []

            for ( let i in query.rows) {
               let e= query.rows[i]
               let pessoa= await e.pessoa().fetch()
               let o = {
                  equipamento_id: e.id, nome: pessoa.nome, pessoa_status: pessoa.status,
                  marca1: e.marca1, modelo1: e.modelo1, placa1: e.placa1,
                  status: e.status, bloqueador: null, localizador: null
               }
               let protecoes= await e.equipamentoProtecoes().fetch()

               protecoes.rows.forEach( x => {
                  if ( x.tipo === 'Localizador') {
                     if ( x.status === 'Removido' || x.status === 'Perdido') {
                        o.localizador= null
                     } else {
                        o.localizador= x.status
                     }
                  }
                  if ( x.tipo === 'Bloqueador') {
                     if ( x.status === 'Removido' || x.status === 'Perdido') {
                        o.bloqueador= null
                     } else {
                        o.bloqueador= x.status
                     }
                  }
                  //if (x.tipo === 'Localizador')  x.status.includes('Removido', 'Perdido') ? o.localizador= null : o.localizador= x.status
                  //if (x.tipo === 'Bloqueador')  x.status.includes('Removido', 'Perdido') ? o.bloqueador= null: o.bloqueador= x.status

               })

               if ( o.bloqueador && o.localizador) {

               } else {
                  arr.push(o)
               }

            }

            return arr
         }

         if ( status) {
            query = await Database
               .select(['equipamentos.id as equipamento_id','equipamentos.placa1', 'equipamentos.placa2','equipamentos.placa3','equipamentos.status',
                  'equipamentos.marca1', 'equipamentos.modelo1',
                  'equipamento_protecaos.id as protecao_id', 'equipamento_protecaos.dAtivacao', 'equipamento_protecaos.dRemocao','equipamento_protecaos.tipo',
                  'equipamento_protecaos.status as protecao_status','nome', 'pessoas.status as pessoa_status'])
               .from('equipamentos')
               .leftOuterJoin('pessoas', 'equipamentos.pessoa_id', 'pessoas.id') //.where('pessoas.modulo', 'Associado')
               .innerJoin('equipamento_protecaos', 'equipamentos.id', 'equipamento_protecaos.equipamento_id')
               .orderBy(['pessoas.nome', 'equipamento_protecaos.tipo'])
               .whereIn('equipamento_protecaos.status', status)
         } else {
            query = await Database
               .select(['equipamentos.id as equipamento_id','equipamentos.placa1', 'equipamentos.placa2','equipamentos.placa3','equipamentos.status',
                  'equipamentos.marca1', 'equipamentos.modelo1',
                  'equipamento_protecaos.id as protecao_id', 'equipamento_protecaos.dAtivacao', 'equipamento_protecaos.dRemocao','equipamento_protecaos.tipo',
                  'equipamento_protecaos.status as protecao_status','nome', 'pessoas.status as pessoa_status'])
               .from('equipamentos')
               .leftOuterJoin('pessoas', 'equipamentos.pessoa_id', 'pessoas.id') //.where('pessoas.modulo', 'Associado')
               .innerJoin('equipamento_protecaos', 'equipamentos.id', 'equipamento_protecaos.equipamento_id')
               .orderBy(['pessoas.nome', 'equipamento_protecaos.tipo'])
         }

         return query
      } catch (error) {
         console.log(error);
         throw error
      }

   }

  async buscarBeneficios(payload) {

      try {

         let beneficio_id = payload.beneficio_id
         let tipo= !payload.tipo ? null : payload.tipo

         const query = await Model.query()
            .with('pessoa')
            .with('equipamentoProtecoes')
            //.setHidden(['idPai'])
            .where('status', 'Ativo')
            .fetch()

         let arr= []

         for ( let i in query.rows) {
            let e= query.rows[i]
            let pessoa= await e.pessoa().fetch()
            let o = {
               equipamento_id: e.id, nome: pessoa.nome, pessoa_status: pessoa.status,
               marca1: e.marca1, modelo1: e.modelo1, placa1: e.placa1,
               status: e.status, protecao: null, beneficio_id: null
            }
            let beneficios= await e.equipamentoBeneficios().fetch()

            let isAddNaoContem= true
            let semBeneficios= ''  // "0001" 1= tem beneficio 0= nao tem beneficio

            if ( tipo === 'sem-beneficios') {
               if ( beneficios.rows.length === 0) {
                  arr.push(o)
               }
            }

            beneficios.rows.forEach( x => {
               if ( tipo === 'contem') {
                  if ( x.beneficio_id === beneficio_id && x.status === 'Ativo') {
                     o.beneficio_id= x.beneficio_id
                     arr.push(o)
                  }
               }
               if ( tipo === 'nao-contem') {
                  if ( x.beneficio_id === beneficio_id && x.status === 'Ativo') {
                     o.beneficio_id= x.beneficio_id
                     isAddNaoContem= false  // não exibir registro
                  }
               }

               if ( tipo === 'sem-beneficios') {
                  if ( x.status === 'Inativo') {
                     o.beneficio_id= x.beneficio_id
                     semBeneficios= semBeneficios + '1'
                  }
               }
            })

            if ( tipo === 'nao-contem') {
               if ( isAddNaoContem ) {
                  arr.push(o)
               }

            }

            if ( tipo === 'sem-beneficios') {
               if ( semBeneficios.includes('1') === true ) {
                  arr.push(o)
               }
            }
         }


         return arr
      } catch (error) {
         console.log(error);
         throw error
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
