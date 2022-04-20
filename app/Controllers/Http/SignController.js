'use strict'
const Servico = use('App/Services/Sign/Sign')

class SignController {
	async converter({ response }) {
		const Model = use('App/Models/Sign')
		const Env = use('Env')
		const URL_SERVIDOR_WEB = Env.get('URL_SERVIDOR_SIGN')
		const ModelPessoa = use('App/Models/Pessoa')
		const ModelPessoaSign = use('App/Models/PessoaSign')
		const ModelEquipamento = use('App/Models/Equipamento')
		const ModelEquipamentoSign = use('App/Models/EquipamentoSign')
		const lodash = use('lodash')
		const moment = require('moment')
		moment.locale('pt-br')
		const fs = require('fs')
		const BrM = require('br-masks')

		const encrypt = o => {
			const cpf = o.signatarioCpf.substring(0, 4)

			return `${cpf}${o.id}`
		}

		const query = await Model.query().whereNull('dataJson').fetch()

		for (const key in query.rows) {
			let e = query.rows[key]
			if (e.tipo === 'Requerimento de Inscrição') {
				const modelSign = await Model.findOrFail(e.id)
				const modelPessoaSign = await ModelPessoaSign.findBy({
					sign_id: e.id,
				})
				if (modelPessoaSign) {
					console.log('modelPessoaSign.id= ', modelPessoaSign.id)
				} else {
					console.log('falhou modelPessoaSign.id modelSign.id= ', e.id)
				}
				const pessoa = await ModelPessoa.findOrFail(
					modelPessoaSign.pessoa_id
				)

				if (modelSign.link) {
					const crypto_sign_id = encrypt(modelSign)
					let link = `${URL_SERVIDOR_WEB}/sign/${crypto_sign_id}`
					modelSign.link = link
				}

				let pessoaJson = pessoa.toJSON()
				pessoaJson.cpfCnpj =
					pessoaJson.tipoPessoa === 'Física'
						? BrM.cpf(pessoaJson.cpfCnpj)
						: BrM.cnpj(pessoaJson.cpfCnpj)
				pessoaJson.dNasc = pessoaJson.dNasc
					? moment(pessoaJson.dNasc, 'YYYY-MM-DD').format('DD/MM/YYYY')
					: ''
				pessoaJson.responsavel = pessoaJson.responsavel
					? pessoaJson.responsavel.toUpperCase()
					: ''
				pessoaJson.endRua = pessoaJson.endRua
					? pessoaJson.endRua.toUpperCase()
					: ''
				if (pessoaJson.endComplemento) {
					pessoaJson.endRua =
						pessoaJson.endRua +
						' ' +
						pessoaJson.endComplemento.toUpperCase()
				}
				pessoaJson.endBairro = pessoaJson.endBairro
					? pessoaJson.endBairro.toUpperCase()
					: ''
				pessoaJson.endCidade = pessoaJson.endCidade
					? pessoaJson.endCidade.toUpperCase()
					: ''
				pessoaJson.endEstado = pessoaJson.endEstado
					? pessoaJson.endEstado.toUpperCase()
					: ''
				pessoaJson.endCep = pessoaJson.endCep
					? BrM.cep(pessoaJson.endCep)
					: ''
				pessoaJson.telFixo = pessoaJson.telFixo
					? BrM.phone(pessoaJson.telFixo)
					: ''
				pessoaJson.telSms = pessoaJson.telSms
					? BrM.phone(pessoaJson.telSms)
					: ''
				pessoaJson.telCelular = pessoaJson.telCelular
					? BrM.phone(pessoaJson.telCelular)
					: ''

				pessoaJson.matricula = `${pessoaJson.id}`
				pessoaJson.matricula = pessoaJson.matricula.padStart(10, '0')

				modelSign.merge({ dataJson: JSON.stringify(pessoaJson) })

				console.log('pessoa ', pessoa.nome)

				await modelSign.save()
			}

			if (e.tipo === 'Requerimento de Adesão') {
				const modelSign = await Model.findOrFail(e.id)
				const modelEquipamentoSign = await ModelEquipamentoSign.findBy({
					sign_id: e.id,
				})
				if (modelEquipamentoSign) {
					console.log('modelEquipamentoSign.id= ', modelEquipamentoSign.id)
				} else {
					console.log(
						'falhou modelEquipamentoSign.id modelSign.id= ',
						e.id
					)
				}
				const modelEquipamento = await ModelEquipamento.findOrFail(
					modelEquipamentoSign.equipamento_id
				)
				await modelEquipamento.load('pessoa')
				await modelEquipamento.load('categoria')
				await modelEquipamento.load('equipamentoProtecoes')
				//await modelEquipamento.load('equipamentoSigns.signs')
				await modelEquipamento.load('equipamentoBeneficios.beneficio')
				//await modelEquipamento.load('equipamentoRestricaos')

				if (modelSign.link) {
					const crypto_sign_id = encrypt(modelSign)
					let link = `${URL_SERVIDOR_WEB}/sign/${crypto_sign_id}`
					modelSign.link = link
				}

				const equipaJson = modelEquipamento.toJSON()

				modelSign.merge({
					dataJson: JSON.stringify(equipaJson),
				})

				await modelSign.save()

				console.log('equipamento ID ', modelEquipamento.id)
			}
		}

		response.send(query.rows)
	}

	async localizar({ request, response, auth }) {
		try {
			let dados = request.all()

			let servico = await new Servico().localizar(dados)
			return servico
		} catch (e) {
			response.status(400).send({ success: false, message: e.message })
		}
	}

	async show({ params, response }) {
		try {
			let servico = await new Servico().show(params.sign_id)
			return servico
		} catch (e) {
			let msg = e.message
			if (e.status === 404) {
				msg = 'Arquivo de assinatura não localizada no servidor'
			}
			response.status(400).send({ success: false, message: msg })
		}
	}

	async add({ request, response, auth }) {
		try {
			let dados = request.all()
			dados.data.user_id = auth.user.id

			let servico = await new Servico().add(dados)
			return servico
		} catch (e) {
			response.status(400).send({ success: false, message: e.message })
		}
	}

	async criarDocumentoEmPdf({ request, response, auth }) {
		try {
			let dados = request.all()
			//dados.data.user_id = auth.user.id

			let servico = await new Servico().criarDocumentoEmPdf(
				dados.id,
				dados.isAssinar,
				dados.tipo
			)
			return servico
		} catch (e) {
			response.status(400).send({ success: false, message: e.message })
		}
	}

	async update({ request, response }) {
		try {
			let dados = request.all()

			let servico = await new Servico().update(dados)
			return servico
		} catch (e) {
			response.status(400).send({ success: false, message: e.message })
		}
	}

	async updateStatus({ request, response }) {
		try {
			let dados = request.all()

			let servico = await new Servico().updateStatus(dados)
			return servico
		} catch (e) {
			response.status(400).send({ success: false, message: e.message })
		}
	}

	async cancelar({ params, response }) {
		try {
			let id = params.id

			let servico = await new Servico().cancelar(id)

			return servico
		} catch (e) {
			response.status(400).send({ success: false, message: e.message })
		}
	}

	async enviarToken({ params, response }) {
		try {
			let id = params.id

			let servico = await new Servico().enviarToken(id)
			return servico
		} catch (e) {
			response.status(400).send({ success: false, message: msg })
		}
	}

	async gerarDocumento({ request, response, auth }) {
		try {
			const data = request.all()
			if (auth.user) {
				data.user_id = auth.user.id
			}
			//
			data.ip = request.ip()

			let servico = await new Servico().gerarDocumento(data)
			return servico
		} catch (e) {
			response.status(400).send({ success: false, message: e.message })
		}
	}

	async solicitarAssinatura({ request, response, auth }) {
		try {
			const data = request.all()
			data.user_id = auth.user.id

			let servico = await new Servico().solicitarAssinatura(data)
			return servico
		} catch (e) {
			response.status(400).send({ success: false, message: e.message })
		}
	}

	async pdf({ params, response }) {
		try {
			const sign_id = params.sign_id
			const tipo = params.tipo
			const isBase64 = params.isBase64 === 'false' ? false : true

			let servico = await new Servico().pdf(sign_id, tipo, isBase64)

			if (servico) {
				if (isBase64) {
					return response.status(200).send(servico)
				} else {
					return response
						.header('Content-type', 'application/pdf')
						.download(servico)
				}
			}
			throw { message: 'Não foi possível localizar o documento PDF' }
		} catch (e) {
			response.status(400).send({ success: false, message: e.message })
		}
	}
}

module.exports = SignController
