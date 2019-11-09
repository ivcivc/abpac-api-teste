'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class OsConfig extends Model {

   planoDeConta() {
      return this.hasOne('App/Models/PlanoDeConta', 'planoDeConta_id','id')
   }

}

module.exports = OsConfig
