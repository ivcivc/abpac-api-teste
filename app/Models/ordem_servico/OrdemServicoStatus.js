'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class OrdemServicoStatus extends Model {
   user() {
      return this.hasOne('App/Models/User', 'user_id', 'id')
   }

   ordem_servico() {
      return this.belongsTo(
         'App/Models/ordem_servico/OrdemServico',
         'ordem_servico_id',
         'id'
      )
   }
}

module.exports = OrdemServicoStatus
