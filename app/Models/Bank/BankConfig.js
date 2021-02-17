'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class BankConfig extends Model {
   authorizations() {
      return this.hasMany('App/Models/Bank/BankConfigAuthorization')
   }
   conta() {
      return this.hasOne('App/Models/Conta', 'conta_id', 'id')
   }
}

module.exports = BankConfig
