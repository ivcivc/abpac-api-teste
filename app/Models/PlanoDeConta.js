'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

const Ws = use('Ws')

class PlanoDeConta extends Model {


   static boot () {
      super.boot()

      this.addHook('afterUpdate', 'Financeiro/PlanoContasHook.all')
      this.addHook('afterCreate', 'Financeiro/PlanoContasHook.all')


   }


}

module.exports = PlanoDeConta
