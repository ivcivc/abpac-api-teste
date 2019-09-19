'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Pessoa extends Model {

   /*pessoaStatuses () {
      return this.belongsTo('App/Models/PessoaStatus', 'pessoa_id', 'id')
    }*/

   pessoaStatuses () {
      return this.hasMany('App/Models/PessoaStatus')
    }
}

module.exports = Pessoa
