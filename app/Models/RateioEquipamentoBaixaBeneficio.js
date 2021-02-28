'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RateioEquipamentoBaixaBeneficio extends Model {
   equipamento() {
      return this.hasMany('App/Models/RateioEquipamentoBaixa')
   }
}

module.exports = RateioEquipamentoBaixaBeneficio
