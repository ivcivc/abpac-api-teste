'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RateioCategoria extends Model {
   rateio() {
      return this.hasMany('App/Models/Rateio')
   }

   categoria() {
      return this.hasOne('App/Models/Categoria', 'categoria_id', 'id')
   }
}

module.exports = RateioCategoria
