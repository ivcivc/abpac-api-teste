'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class LancamentoItem extends Model {
   item() {
      return this.belongsTo('App/Models/Lancamento')
   }

   /*item() {
      return this.belongsToMany('App/Models/Lancamento')
   }*/
}

module.exports = LancamentoItem
