'use strict'

const Services = use('App/Services/EquipamentoBeneficio')

const Database = use('Database')

class EquipamentoBeneficioController {
	async index({ request, response }) {
		try {
			const model = await new Services().index()

			//await model.load('equipamentoBeneficioStatuses')

			response.status(200).send({ type: true, data: model })
		} catch (error) {
			response.status(400).send({
				code: error.code,
				message: error.message,
				name: error.name,
			})
		}
	}

	async store({ request, response, auth }) {
		const payload = request.all()

		payload['status'] = 'Ativo'

		let trx = null

		try {
			trx = await Database.beginTransaction()

			const model = await new Services().add(payload, trx, auth)

			await trx.commit()

			await model.load('beneficio')
			await model.load('equipamentoBeneficioStatuses')

			response.status(200).send({ type: true, data: model })
		} catch (error) {
			await trx.rollback()
			response.status(400).send(error)
		}
	}

	async show({ params, response }) {
		console.log('foi....')
		try {
			const model = await new Services().get(params.id)

			await model.load('equipamentoBeneficioStatuses')
			//await model.load('equipamentoBeneficioStatuses.beneficio')
			//const bs= model.equipamentoBeneficioStatuses
			//bs.rows.forEach( e => console.log(e))

			response.status(200).send({ type: true, data: model })
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

		delete payload['equipamentoBeneficioStatuses']

		let trx = null

		try {
			trx = await Database.beginTransaction()

			const model = await new Services().update(ID, payload, trx, auth)

			await trx.commit()

			await model.load('equipamentoBeneficioStatuses')
			await model.load('beneficio')

			response.status(200).send({ type: true, data: model })
		} catch (error) {
			await trx.rollback()
			response.status(400).send(error)
		}
	}

	async destroy({ params, response }) {
		let trx = null

		try {
			trx = await Database.beginTransaction()

			const model = await new Services().del(params.id, trx)

			return model
		} catch (error) {
			await trx.rollback()
			response.status(400).send(error)
		}
	}

	async getLog({ request, response }) {
		try {
			const { equipamento_beneficio_id } = request.only(
				'equipamento_beneficio_id'
			)
			const resp = await new Services().getLog(equipamento_beneficio_id)

			response.status(200).send({ type: true, data: resp })
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

module.exports = EquipamentoBeneficioController
