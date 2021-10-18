'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FileItemSchema extends Schema {
	up() {
		this.table('file_items', table => {
			table.integer('sign_id').index()
			table.boolean('isSignOriginal').defaultTo(false)
		})
	}

	down() {
		this.table('file_items', table => {
			// reverse alternations
			table.dropColumn('sign_id')
			table.dropColumn('isSignOriginal')
		})
	}
}

module.exports = FileItemSchema
