'use strict'

//const Ws = use('Ws')

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Pessoa extends Model {
   static boot() {
      super.boot()

      this.addHook('afterUpdate', 'PessoaHook.updateWs')
      this.addHook('afterCreate', 'PessoaHook.updateWs')
   }

   equipamentos() {
      return this.hasMany('App/Models/Equipamento')
   }

   pessoaStatuses() {
      return this.hasMany('App/Models/PessoaStatus')
   }

   pendencias() {
      return this.hasMany('App/Models/Pendencia')
   }

   pessoaSigns() {
      return this.hasMany('App/Models/PessoaSign')
   }
}

module.exports = Pessoa
