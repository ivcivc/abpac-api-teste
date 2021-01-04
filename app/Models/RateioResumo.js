'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RateioResumo extends Model {
   rateio() {
      return this.hasMany('App/Models/Rateio')
   }
}

module.exports = RateioResumo
