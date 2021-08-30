'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Equipamento extends Model {
   equipamentoStatuses() {
      return this.hasMany('App/Models/EquipamentoStatus')
   }

   ocorrencias() {
      return this.hasMany('App/Models/Ocorrencia')
   }

   pessoa() {
      return this.hasOne('App/Models/Pessoa', 'pessoa_id', 'id')
   }

   categoria() {
      return this.hasOne('App/Models/Categoria', 'categoria_id', 'id')
   }

   signs() {
      return this.hasMany('App/Models/EquipamentoSign')
   }

   equipamentoProtecoes() {
      return this.hasMany('App/Models/EquipamentoProtecao')
   }

   equipamentoBeneficios() {
      return this.hasMany('App/Models/EquipamentoBeneficio')
   }

   equipamentoRestricaos() {
      return this.hasMany('App/Models/EquipamentoRestricao')
   }
}

module.exports = Equipamento
