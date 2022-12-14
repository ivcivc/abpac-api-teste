'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class OcorrenciaStatus extends Model {
   pessoa() {
      return this.belongsTo('App/Models/Pessoa', 'pessoa_id', 'id')
   }

   user() {
      return this.hasOne('App/Models/User', 'user_id', 'id')
   }

   equipamento() {
      return this.hasOne('App/Models/Equipamento', 'equipamento_id', 'id')
   }
}

module.exports = OcorrenciaStatus
