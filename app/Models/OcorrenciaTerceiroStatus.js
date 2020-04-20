'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class OcorrenciaTerceiroStatus extends Model {

   user() {
      return this.hasOne('App/Models/User','user_id', 'id')
   }

   terceiro () {
      return this.belongsTo('App/Models/OcorrenciaTerceiro', 'ocorrencia_terceiro_id', 'id')
   }

}

module.exports = OcorrenciaTerceiroStatus
