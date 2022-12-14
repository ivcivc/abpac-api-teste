'use strict'

const EquipamentoProtecaoServices = use('App/Services/EquipamentoProtecao')
const Database = use('Database')

class EquipamentoProtecaoController {
	async index({ request, response, view }) {}

	async store({ request, response, auth }) {
		const payload = request.all()

		let equipamento_id = payload.equipamento_id
		let trx = null

		try {
			trx = await Database.beginTransaction()

			const protecao = await new EquipamentoProtecaoServices().update(
				equipamento_id,
				payload,
				null,
				auth
			)

			await trx.commit()

			response.status(200).send({ type: true, data: protecao })
		} catch (error) {
			await trx.rollback()
			console.log(error)
			response.status(400).send(error)
		}
	}

	async show({ params, response }) {
		try {
			const protecao = await new EquipamentoProtecaoServices().get(params.id)

			response.status(200).send({ type: true, data: protecao })
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

		let trx = null

		try {
			trx = await Database.beginTransaction()

			const protecao = await new EquipamentoProtecaoServices().update(
				ID,
				payload,
				null,
				auth
			)

			await trx.commit()

			response.status(200).send({ type: true, data: protecao })
		} catch (error) {
			await trx.rollback()
			console.log(error)
			response.status(400).send(error)
		}
	}

	async destroy({ params, request, response }) {}

	async localizarPorMarca({ request, response }) {
		const payload = request.all()
		if (payload.field_value_marca) {
			payload.field_value_marca = payload.field_value_marca.split(',')
		}
		try {
			const busca =
				await new EquipamentoProtecaoServices().localizarPorMarca(payload)

			response.status(200).send(busca)
		} catch (error) {
			console.log(error)
			response.status(400).send({
				code: error.code,
				message: error.message,
				name: error.name,
			})
		}
	}

	async localizarSemProtecao({ response }) {
		try {
			const busca =
				await new EquipamentoProtecaoServices().localizarSemProtecao()

			response.status(200).send(busca)
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

module.exports = EquipamentoProtecaoController
