'use strict'

const Model = use('App/Models/Estoque')
const Services = use('App/Services/Estoque')

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

	async localizar({ params, request, response, view }) {
		try {
			const descricao = params.descricao === 'todos' ? '' : params.descricao
			const model = await Model.query()
				.where('descricao', 'like', `%${descricao}%`)
				.whereNull('saida_id')
				.orderBy('descricao')
				.with('osEntrada')
				.fetch()

			response.status(200).send({ type: true, data: model.rows })
		} catch (error) {
			console.log(error)
			response.status(400).send({
				code: error.code,
				message: error.message,
				name: error.name,
			})
		}
	}

	async localizarPor({ request, response }) {
		const payload = request.all()

		try {
			const query = await new Services().localizarPor(payload)

			response.status(200).send(query)
		} catch (error) {
			console.log(error)
			response.status(400).send(error)
		}
	}
}

module.exports = EstoqueController
