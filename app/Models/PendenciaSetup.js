'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class PendenciaSetup extends Model {
   signs() {
      return this.hasMany('App/Models/Signs')
   }
}

module.exports = PendenciaSetup
