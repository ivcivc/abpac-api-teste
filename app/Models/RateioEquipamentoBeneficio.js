'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RateioEquipamentoBeneficio extends Model {
   equipamento() {
      return this.hasMany('App/Models/RateioEquipamento')
   }
}

module.exports = RateioEquipamentoBeneficio
