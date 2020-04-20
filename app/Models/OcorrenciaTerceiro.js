'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class OcorrenciaTerceiro extends Model {

   statuses () {
      return this.hasMany('App/Models/OcorrenciaTerceiroStatus')
   }

   terceiros() {
      return this.belongsToMany('App/Models/Ocorrencia')
   }
}

module.exports = OcorrenciaTerceiro
