'use strict'

//const Ws = use('Ws')

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')


class Pessoa extends Model {


   static boot () {
      super.boot()

      /*this.addHook('beforeUpdate', async () => {

         const topic= Ws.getChannel('ordem-servico:*').topic('ordem-servico:ordem-servico')
         if (topic ) {
            topic.broadcast("ORDEM-SERVICO-REFRESH", [{id: 11, nome: "ivan NOÉ"},{id:20 , nome: "Carlos da ROCHA"}])
         }
      })*/

    }

    equipamentos() {
       return this.hasMany('App/Models/Equipamento')
    }

   pessoaStatuses () {
      return this.hasMany('App/Models/PessoaStatus')
    }

    pendencias() {
      return this.hasMany('App/Models/Pendencia')
    }
}

module.exports = Pessoa
