'use strict'

const EndossoServices = use('App/Services/Endosso')

class EndossoController {
	async localizarPor({ request, response, auth }) {
		const payload = request.all()

		try {
			const service = await new EndossoServices().localizarPor(
				payload,
				null,
				auth
			)

			response.status(200).send({ type: true, data: service })
		} catch (error) {
			console.log(error)
			response.status(400).send(error)
		}
	}
}

module.exports = EndossoController
