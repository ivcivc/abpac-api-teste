'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class OrdemServicoItem extends Model {
   ordemServico() {
      return this.belongsTo('App/Models/OrdemServico')
   }

   items() {
      return this.belongsToMany('App/Models/OrdemServico')
   }
}

module.exports = OrdemServicoItem
