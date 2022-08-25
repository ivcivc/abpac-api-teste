'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

/** @type {import('@adonisjs/framework/src/Hash')} */
const Hash = use('Hash')

class UserMobile extends Model {
	static get traits() {
		return [
			'@provider:Adonis/Acl/HasRole',
			'@provider:Adonis/Acl/HasPermission',
		]
	}

	static boot() {
		super.boot()

		this.addHook('beforeSave', async userInstance => {
			if (userInstance.dirty.password) {
				userInstance.password = await Hash.make(userInstance.password)
			}
		})
	}

	pessoa() {
		return this.hasOne('App/Models/Pessoa', 'pessoa_id', 'id')
	}
}

module.exports = UserMobile
