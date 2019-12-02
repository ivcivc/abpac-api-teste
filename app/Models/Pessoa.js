'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Pessoa extends Model {

   /*pessoaStatuses () {
      return this.belongsTo('App/Models/PessoaStatus', 'pessoa_id', 'id')
    }*/
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
