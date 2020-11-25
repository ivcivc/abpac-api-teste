'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

const Ws = use('Ws')

class OsConfig extends Model {
   static boot() {
      super.boot()

      this.addHook('afterCreate', async data => {
         const topic = Ws.getChannel('ordem-servico:*').topic(
            'ordem-servico:ordem-servico'
         )
         if (topic) {
            topic.broadcast('ORDEM-SERVICO-REFRESH', [data])
         }
      })

      this.addHook('afterUpdate', async data => {
         const topic = Ws.getChannel('ordem-servico:*').topic(
            'ordem-servico:ordem-servico'
         )
         if (topic) {
            topic.broadcast('ORDEM-SERVICO-REFRESH', [data])
         }
      })
   }

   planoDeConta() {
      return this.hasOne('App/Models/PlanoDeConta', 'planoDeConta_id', 'id')
   }

   ordemServico() {
      return this.belongsTo('App/Models/ordem_servico/OrdemServico')
   }
}

module.exports = OsConfig
