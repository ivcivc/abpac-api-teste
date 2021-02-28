'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Rateio extends Model {
   conta() {
      return this.hasOne('App/Models/Conta', 'conta_id', 'id')
   }
   equipamentos() {
      return this.hasMany('App/Models/RateioEquipamento')
   }
   equipamentoBaixas() {
      return this.hasMany('App/Models/RateioEquipamentoBaixa')
   }

   creditoBaixas() {
      return this.hasMany('App/Models/RateioCreditoBaixa')
   }

   equipamentosBeneficios() {
      return this.hasMany('App/Models/RateioEquipamentoBeneficio')
   }

   categorias() {
      return this.hasMany('App/Models/RateioCategoria')
   }
   resumos() {
      return this.hasMany('App/Models/RateioResumo')
   }

   os() {
      return this.hasMany('App/Models/ordem_servico/OrdemServico')
   }

   inadimplentes() {
      return this.hasMany('App/Models/RateioInadimplente')
   }
}

module.exports = Rateio
