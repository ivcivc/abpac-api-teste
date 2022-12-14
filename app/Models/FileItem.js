'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class FileItem extends Model {
   galeria() {
      return this.belongsTo('App/Models/File')
    }
}

module.exports = FileItem
