'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class BankConfigAuthorization extends Model {
   bankConfig() {
      return this.hasOne('App/Models/Bank/BankConfig')
   }
}

module.exports = BankConfigAuthorization
