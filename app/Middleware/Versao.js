'use strict'
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

class Versao {
	/**
	 * @param {object} ctx
	 * @param {Request} ctx.request
	 * @param {Function} next
	 */
	async handle({ request, response }, next) {
		// call next to advance the request

		const headers = request.headers()
		if (headers.versao !== '1.54') {
			return response
				.status(404)
				.send(
					'Foi detectado uma nova versão. Pressione CRTL+F5 para atualizar.'
				)
		}

		await next()
	}
}

module.exports = Versao
