'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class EquipamentoBeneficio extends Model {
   equipamentoBeneficioStatuses() {
      return this.hasMany('App/Models/EquipamentoBeneficioStatus')
   }

   equipamentos() {
      return this.hasMany('App/Models/Equipamento')
   }

   beneficio() {
      return this.hasOne('App/Models/Beneficio', 'beneficio_id', 'id')
      //return this.belongsTo('App/Models/Beneficio')
   }
}

module.exports = EquipamentoBeneficio
