'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Boleto extends Model {
   lancamento() {
      return this.belongsTo('App/Models/Lancamento')
   }
}

module.exports = Boleto
