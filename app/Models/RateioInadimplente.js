'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RateioInadimplente extends Model {
   rateio() {
      return this.hasMany('App/Models/Rateio')
   }

   lancamento() {
      return this.hasOne('App/Models/Lancamento', 'lancamento_id', 'id')
   }
}

module.exports = RateioInadimplente
