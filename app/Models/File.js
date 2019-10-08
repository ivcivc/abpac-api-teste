'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class File extends Model {

   pessoa() {
      return this.hasOne('App/Models/Pessoa', 'idParent','id')
   }

}

module.exports = File
