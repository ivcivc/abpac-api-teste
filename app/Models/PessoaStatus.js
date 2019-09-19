'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class PessoaStatus extends Model {

   /*pessoaStatuses () {
      return this.hasMany('App/Models/PessoaStatus')
    }*/

   pessoa () {
      return this.belongsTo('App/Models/Pessoa', 'pessoa_id', 'id')
    }

   user() {
      return this.hasOne('App/Models/User','user_id', 'id')
   }

}

module.exports = PessoaStatus
