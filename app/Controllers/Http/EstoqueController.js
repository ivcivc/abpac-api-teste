'use strict'

class EstoqueController {
	async index({ request, response, view }) {}

	async show({ params, request, response, view }) {
		try {
			const service = await new Services().get(params.id)

			response.status(200).send({ type: true, data: service })
		} catch (error) {
			console.log(error)
			response.status(400).send({
				code: error.code,
				message: error.message,
				name: error.name,
			})
		}
	}
}

module.exports = EstoqueController
