'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class EquipamentoSign extends Model {
   equipamento() {
      return this.hasOne('App/Models/Equipamento', 'equipamento_id', 'id')
   }
}

module.exports = EquipamentoSign
