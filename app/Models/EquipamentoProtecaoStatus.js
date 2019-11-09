'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class EquipamentoProtecaoStatus extends Model {
   equipamento () {
      return this.belongsTo('App/Models/Equipamento', 'equipamento_id', 'id')
    }

   user() {
      return this.hasOne('App/Models/User','user_id', 'id')
   }

}

module.exports = EquipamentoProtecaoStatus
