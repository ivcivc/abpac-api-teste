'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class File extends Model {

   pessoa() {
      return this.hasOne('App/Models/Pessoa', 'pessoa_id','id')
   }

   FileItems() {
      return this.hasMany('App/Models/FileItem')
   }

   FileNotification() {
      return this.hasMany('App/Models/FileNotification')
   }

}

module.exports = File
