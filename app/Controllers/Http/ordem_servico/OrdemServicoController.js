'use strict'

const lodash = require('lodash')

const OrdemServicoService = use('App/Services/OrdemServico')

class OrdemServicoController {
	async index({ params, request, response }) {}

	async store({ request, response, auth }) {
		const payload = request.all()

		try {
			const os = await new OrdemServicoService().add(payload, null, auth)

			response.status(200).send({ type: true, data: os })
		} catch (error) {
			//await new Erro().handle(error, {request, response})
			//throw new Erro(error, {request, response}).handle(error, {request, response})
			//response.status(400).send(error);
			response.status(400).send({ message: error.message, success: false })
		}
	}

	async show({ params, response }) {
		try {
			const os = await new OrdemServicoService().get(params.id)

			response.status(200).send({ type: true, data: os })
		} catch (error) {
			console.log(error)
			response.status(400).send({
				code: error.code,
				message: error.message,
				name: error.name,
			})
		}
	}

	async update({ params, request, response, auth }) {
		const payload = request.all()
		const ID = params.id

		try {
			const os = await new OrdemServicoService().update(
				ID,
				payload,
				null,
				auth
			)

			response.status(200).send({ type: true, data: os })
		} catch (error) {
			console.log(error)
			response.status(400).send(error)
		}
	}

	async destroy({ params, request, response }) {}

	async localizarPor({ request, response }) {
		const payload = request.all()
		let parametros = request.only(['continue', 'start', 'count'])

		if (lodash.has(parametros, 'continue')) {
			if (!lodash.isBoolean(parametros.continue)) {
				parametros.continue = parametros.continue === 'true'
			}
		} else {
			parametros.continue = false
		}
		if (!parametros.continue) {
			parametros.continue = false
			parametros.start = 1
			parametros.count = parseInt(parametros.count)
			parametros.pagina = 1
		} else {
			parametros.pagina =
				parseInt(parametros.start) / parseInt(parametros.count) + 1
			parametros.count = parseInt(parametros.count)
			parametros.start = parseInt(parametros.start)
		}

		try {
			const query = await new OrdemServicoService().localizarPor(
				payload,
				parametros
			)

			response.status(200).send(query)
		} catch (error) {
			console.log(error)
			response.status(400).send(error)
		}
	}

	async localizarOS({ request, response }) {
		const payload = request.all()
		let parametros = request.only(['continue', 'start', 'count'])

		try {
			const query = await new OrdemServicoService().localizarOS(
				payload,
				parametros
			)

			response.status(200).send(query)
		} catch (error) {
			console.log(error)
			response.status(400).send(error)
		}
	}
}

module.exports = OrdemServicoController
