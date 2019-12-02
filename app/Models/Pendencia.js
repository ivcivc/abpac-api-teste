'use strict'
//
/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Pendencia extends Model {

   pendencia_setup() {
      return this.hasOne('App/Models/PendenciaSetup', 'pendencia_setup_id', 'id')
   }

   pessoa() {
      return this.hasOne('App/Models/Pessoa','pessoa_id', 'id')
   }

   equipamento() {
      return this.hasOne('App/Models/Equipamento','equipamento_id', 'id')
   }

}

module.exports = Pendencia
