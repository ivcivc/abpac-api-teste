'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RateioEquipamento extends Model {
   rateio() {
      return this.hasMany('App/Models/Rateio')
   }

   categoria() {
      return this.hasOne('App/Models/Categoria', 'categoria_id', 'id')
   }

   beneficios() {
      return this.hasMany('App/Models/RateioEquipamentoBeneficio')
   }
}

module.exports = RateioEquipamento
