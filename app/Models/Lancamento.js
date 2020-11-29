'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Lancamento extends Model {
   items() {
      return this.hasMany('App/Models/LancamentoItem')
   }

   pessoa() {
      return this.hasOne('App/Models/Pessoa', 'pessoa_id', 'id')
   }

   equipamento() {
      return this.hasOne('App/Models/Equipamento', 'equipamento_id', 'id')
   }
}

module.exports = Lancamento
