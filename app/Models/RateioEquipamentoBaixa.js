'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RateioEquipamentoBaixa extends Model {
   rateio() {
      return this.hasMany('App/Models/Rateio')
   }

   categoria() {
      return this.hasOne('App/Models/Categoria', 'id', 'categoria_id')
   }

   beneficios() {
      return this.hasMany(
         'App/Models/RateioEquipamentoBaixaBeneficio',
         'id',
         'equipa_baixa_id'
      )
   }
}

module.exports = RateioEquipamentoBaixa
