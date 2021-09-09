'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class EquipamentoSign extends Model {
   equipamento() {
      return this.hasOne('App/Models/Equipamento', 'equipamento_id', 'id')
   }

   signs() {
      return this.hasMany('App/Models/Sign', 'sign_id', 'id')
   }
}

module.exports = EquipamentoSign
