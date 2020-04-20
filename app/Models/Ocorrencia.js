'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Ocorrencia extends Model {

   statuses () {
      return this.hasMany('App/Models/OcorrenciaStatus')
   }

   pessoa() {
      return this.hasOne('App/Models/Pessoa', 'pessoa_id','id')
   }

   causa() {
      return this.hasOne('App/Model/Ocorrencia')
   }

   equipamento() {
      return this.hasOne('App/Models/Equipamento', 'equipamento_id','id')
   }

   terceiros() {
      return this.hasMany('App/Models/OcorrenciaTerceiro')
   }
}

module.exports = Ocorrencia
