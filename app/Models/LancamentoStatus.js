'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class LancamentoStatus extends Model {
   user() {
      return this.hasOne('App/Models/User', 'user_id', 'id')
   }

   lancamento() {
      return this.hasOne('App/Models/Lancamento', 'lancamento_id', 'id')
   }
}

module.exports = LancamentoStatus
