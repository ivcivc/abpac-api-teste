'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Sign extends Model {
   sign() {
      return this.belongsTo('App/Models/Sign', 'sign_id', 'id')
   }

   logs() {
      return this.hasMany('App/Models/SignLog')
   }
}

module.exports = Sign
