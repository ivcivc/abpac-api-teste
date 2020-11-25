'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class OcorrenciaTerceiro extends Model {
   statuses() {
      return this.hasMany('App/Models/OcorrenciaTerceiroStatus')
   }

   ocorrencia() {
      return this.hasOne('App/Models/Ocorrencia', 'ocorrencia_id', 'id')
   }

   /*ordemServico() {
      return this.hasOne(
         'App/Models/ordem_servico/OrdemServico',
         'ocorrencia_terceiro_id',
         'id'
      )
   }*/
}

module.exports = OcorrenciaTerceiro
