'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class EquipamentoBeneficioStatus extends Model {
   equipamento_beneficio () {
      return this.belongsTo('App/Models/EquipamentoBeneficio', 'equipamento_beneficio_id', 'id')
    }

   user() {
      return this.hasOne('App/Models/User','user_id', 'id')
   }

}

module.exports = EquipamentoBeneficioStatus
