"use strict";

const Model = use("App/Models/PlanoDeConta")
const lodash= require('lodash')

const Database = use('Database')

class PlanoDeConta {

   async add(data) {
      try {

        let idParent = data['idParent']

        if ( idParent >  0 ) {
           const plano = await Model.findOrFail(idParent);
           data['tipo']= plano.tipo
        }

        const planoConta = await Model.create(data);

        return planoConta;

      } catch (e) {
        throw e;
      }
    }

    async get(ID) {

      try {

        const planoConta = await Model.findOrFail(ID);

        return planoConta;
      } catch (e) {
        throw e;
      }
    }

    async index() {
     try {
        const planoConta = await Model.query().fetch();

        return planoConta;
      } catch (e) {
        throw e;
      }
    }

    async getCombo() {
      try {
         const planoConta = await Model.query().orderBy('level', 'asc').fetch();

         let arr = []

         const search= ( registro, el ) => {
            let idParent= registro.idParent
            el.forEach( e => {
               e._id= e.id
               //delete e['id']
               if ( e.id === idParent) {
                  if ( !lodash.has( e, 'data')) {
                     e['data']= []
                  }
                  e.data.push(registro)
                  return true
               } else {
                  if ( lodash.has( e, 'data')) {
                     return search(registro, e.data)
                  } else {
                     return false
                  }

               }
            })
         }

         planoConta.rows.forEach( e => {
            let registro = {id: e.id, idParent: e.idParent, value: e.descricao, natureza: e.natureza, tipo: e.tipo, isLancar: e.isLancar, isDR: e.isDR, isFluxoCaixa: e.isFluxoCaixa, level: e.level, status: e.status}
            if ( e.idParent === 0) {
               return arr.push(registro)
            }
            arr.forEach( lista => {
               if ( lista.id === e.idParent) {
                  if ( !lodash.has( lista, 'data')) {
                     lista['data']= []
                  }
                  lista.data.push(registro)
                  return true
               }
               if ( lodash.has( lista, 'data')) {
                  let ret= search(registro, lista['data'])
                    if ( ret ) return true
               }
            })

         })


         return arr;
       } catch (e) {
         throw e;
       }
     }

    async getCombo2() {
      try {
         const planoConta = await Model.query().orderBy('idParent', 'asc').fetch();

         let arr = []

         planoConta.rows.forEach( e => {
            let registro = {id: e.id, idParent: e.idParent, descricao: e.descricao, tipo: e.tipo, status: e.status}
            if ( e.idParent === 0) {
               return arr.push(registro)
            }
            let o = lodash.find(arr, {id: e.idParent} )
            if ( o) {
               if ( ! lodash.has( o, 'children')) {
                  o['children']= []
               }
               o.children.push(registro)
            }
         })

         return arr;
       } catch (e) {
         throw e;
       }
     }

     async update_moved(id, OrderIndex) {
      try {

         const planoDestino = await Model.findOrFail(id);
         const planoOrigem = await Model.findOrFail(OrderIndex);

         if ( planoOrigem.tipo !== planoDestino.tipo) {
            throw {message: "Não é possível alterar conta de tipos diferentes.", code: -100}
         }

         planoDestino.idParent= planoOrigem.id

         await planoDestino.save();

         return planoDestino;
      } catch (e) {

         if ( lodash.has( e, 'code')) {
            if ( e.code === -100) {
               throw e
            }
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

    async update(ID, data) {
      try {

         /*if ( lodash.has(data, 'OrderIndex')) {
            return this.update_moved(data.id, data.OrderIndex)
         }*/

         let idParent = data['idParent']

         /*if ( idParent >  0 ) {
            const plano = await Model.findOrFail(idParent);
            data['tipo']= plano.tipo
         }*/

        let planoConta = await Model.findOrFail(ID);

        planoConta.merge(data);

        await planoConta.save();

        return planoConta;
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

    async destroy(ID) {

      try {

        const planoConta = await Model.findOrFail(ID);

        planoConta.delete()

        return planoConta;
      } catch (e) {
        throw e;
      }
    }


}


module.exports = PlanoDeConta;
