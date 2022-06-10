'use strict'

const lodash = require('lodash')
const PessoaServices = use('App/Services/Pessoa')

class PessoaController {
	async store({ request, response, auth }) {
		const payload = request.all()

		try {
			//payload.tipo = 'Associado'
			payload.status = 'Ativo'

			const pessoa = await new PessoaServices().add(payload, null, auth)

			response.status(200).send({ type: true, data: pessoa })
		} catch (error) {
			//await new Erro().handle(error, {request, response})
			//throw new Erro(error, {request, response}).handle(error, {request, response})
			//response.status(400).send(error);
			throw error
		}
	}

	async update({ request, params, response }) {
		const payload = request.all()
		const ID = params.id

		try {
			const pessoa = await new PessoaServices().update(ID, payload, null)

			response.status(200).send({ type: true, data: pessoa })
		} catch (error) {
			console.log(error)
			response.status(400).send(error)
		}
	}

	async show({ params, response, request }) {
		let page = request.only('page')
		let limit = request.only('limit')

		try {
			const pessoa = await new PessoaServices().get(params.id)

			response.status(200).send({ type: true, data: pessoa })
		} catch (error) {
			console.log(error)
			response.status(400).send({
				code: error.code,
				message: error.message,
				name: error.name,
			})
		}
	}

	async index({ response, request }) {
		//let page= request.only(['page','limit'])
		//let limit= request.only('limit')
		let { page, limit, start, count } = request.get()
		let continuar = request.only(['continue'])
		let perPage = null

		if (!continuar) {
			continuar = false
		} else {
			continuar = lodash.isEmpty(continuar) ? false : continuar.continue
		}

		if (start) {
			page = start / count + 1
			perPage = count
			limit = count
			console.log('nova pagina ', page)
		} else {
			console.log('sem start ............................')
			//page= 1
			limit = 3
		}

		try {
			const pessoa = await new PessoaServices().index(page, limit)
			pessoa.pages.total_count = pessoa.pages.total
			pessoa.pages.continue = continuar
			if (continuar) {
				pessoa.pages.pos = start
				/*if ( pessoa.pages.page ===  2) {
            pessoa.pages.pos= 3
        } else {
           pessoa.pages.pos= pessoa.pages.page * pessoa.pages.perPage - pessoa.pages.page
        }*/
			}

			response.status(200).send(pessoa)
		} catch (error) {
			console.log(error)
			response.status(400).send({
				code: error.code,
				message: error.message,
				name: error.name,
			})
		}
	}

	async isCpfCnpj({ params, response }) {
		let doc = params.cpfCnpj
		if (doc === 'null') {
			doc = null
		}
		let id = params.id
		if (id === 'null') {
			id = null
		}

		const res = await new PessoaServices().isCpfCnpj(doc, 'Associado', id)

		return res
	}

	async isCpfCnpjFornecedor({ params, response }) {
		let doc = params.cpfCnpj
		if (doc === 'null') {
			doc = null
		}
		let id = params.id
		if (id === 'null') {
			id = null
		}

		const res = await new PessoaServices().isCpfCnpj(doc, 'Fornecedor', id)

		return res
	}

	async localizarPorMesAno({ request, response }) {
		const payload = request.all()
		try {
			const pessoa = await new PessoaServices().localizarPorMesAno(payload)

			response.status(200).send({ success: true, data: pessoa })
		} catch (error) {
			console.log(error)
			response.status(400).send({
				code: error.code,
				message: error.message,
				name: error.name,
			})
		}
	}

	async LocalizarCidadeEstadoAgrupado({ response }) {
		try {
			const query =
				await new PessoaServices().LocalizarCidadeEstadoAgrupado()

			response.status(200).send({ success: true, data: query })
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

module.exports = PessoaController
