'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RateioCreditoBaixa extends Model {
   rateio() {
      return this.hasMany('App/Models/Rateio')
   }
}

module.exports = RateioCreditoBaixa
