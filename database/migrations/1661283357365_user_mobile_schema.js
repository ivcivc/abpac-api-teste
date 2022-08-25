'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UserMobileSchema extends Schema {
	up() {
		this.create('user_mobiles', table => {
			table.increments()

			table
				.integer('pessoa_id')
				.unsigned()
				.notNullable()
				.references('id')
				.inTable('pessoas')
				.onUpdate('CASCADE')
				.onDelete('CASCADE')

			table.varchar('login', 254).notNullable().unique()
			table.string('password', 60).notNullable()
			table.string('token').defaultTo(null)

			table.boolean('isNewPassword').defaultTo(true)
			table.boolean('isBlock').defaultTo(true)
			table.timestamp('token_created_at')
			table.timestamp('updated_at')
		})
	}

	down() {
		this.drop('user_mobiles')
	}
}

module.exports = UserMobileSchema
