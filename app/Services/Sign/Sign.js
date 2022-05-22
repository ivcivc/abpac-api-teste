'use strict'

const Model = use('App/Models/Sign')
const ModelSignLog = use('App/Models/SignLog')
const ModelPessoa = use('App/Models/Pessoa')
const ModelPessoaSign = use('App/Models/PessoaSign')
const ModelEquipamento = use('App/Models/Equipamento')
const ModelEquipamentoSign = use('App/Models/EquipamentoSign')
const crypto = require('crypto')
const Env = use('Env')
const Helpers = use('Helpers')
const lodash = use('lodash')
const moment = require('moment')
moment.locale('pt-br')
const fs = require('fs')
const BrM = require('br-masks')
const Database = use('Database')
const factory = use('App/Services/SMS/Factory')
const Mail = use('Mail')
const URL_SERVIDOR_SIGN_EMAIL = Env.get('URL_SERVIDOR_SIGN_EMAIL')
const ServiceFichaInscricao = use('App/Services/Sign/FichaInscricao')
const ServiceAdesao = use('App/Services/Sign/Adesao')
const ServiceSubstituicao = use('App/Services/Sign/Substituicao')
const ServiceBaixa = use('App/Services/Sign/Baixa')
const Drive = use('Drive')

class Sign {
	async show(sign_id) {
		try {
			const modelSign = await Model.findOrFail(sign_id)
			console.log(modelSign.toJSON())
			return modelSign
		} catch (e) {
			throw e
		}
	}

	async add(payload) {
		return new Promise(async (resolve, reject) => {
			let trx = null
			try {
				if (!trx) {
					trx = await Database.beginTransaction()
				}

				const tipo = payload.tipo

				const dados = payload.data

				let preCadastro_id = null
				let modelSub = null

				let docID = await crypto.randomBytes(20).toString('hex')
				dados.doc_id = docID
				delete dados['isSolicitarAssinatura']
				delete dados['pessoa_id']
				delete dados['equipamento_id']
				delete dados['preCadastro_id']

				const modelSign = await Model.create(dados, trx)
				//const modelSign = await trx.insert(dados).into('signs')

				switch (tipo) {
					case 'Requerimento de Inscrição':
						// payload pessoa_id,preCadastro_id e tipo. OBJETO: data: sign
						const pessoa = await ModelPessoa.findOrFail(payload.pessoa_id)
						let pessoaJson = pessoa.toJSON()
						pessoaJson.cpfCnpj =
							pessoaJson.tipoPessoa === 'Física'
								? BrM.cpf(pessoaJson.cpfCnpj)
								: BrM.cnpj(pessoaJson.cpfCnpj)
						pessoaJson.dNasc = pessoaJson.dNasc
							? moment(pessoaJson.dNasc, 'YYYY-MM-DD').format(
									'DD/MM/YYYY'
							  )
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
						await modelSign.save(trx)

						preCadastro_id = payload.preCadastro_id
							? payload.preCadastro_id
							: null
						modelSub = await ModelPessoaSign.create(
							{
								pessoa_id: pessoaJson.id,
								sign_id: modelSign.id,
								preCadastro_id,
							},
							trx
						)
						await modelSub.save(trx)
						break
					case 'Requerimento de Adesão':
						const modelEquipamento = await ModelEquipamento.findOrFail(
							payload.equipamento_id
						)
						//await modelEquipamento.load('equipamentoStatuses')
						await modelEquipamento.load('pessoa')
						await modelEquipamento.load('categoria')
						await modelEquipamento.load('equipamentoProtecoes')
						//await modelEquipamento.load('equipamentoSigns.signs')
						await modelEquipamento.load('equipamentoBeneficios.beneficio')
						//await modelEquipamento.load('equipamentoRestricaos')

						const equipaJson = modelEquipamento.toJSON()

						modelSign.merge({
							dataJson: JSON.stringify(equipaJson),
						})
						await modelSign.save(trx)

						preCadastro_id = payload.preCadastro_id
							? payload.preCadastro_id
							: null
						modelSub = await ModelEquipamentoSign.create(
							{
								equipamento_id: modelEquipamento.id,
								sign_id: modelSign.id,
								preCadastro_id,
							},
							trx
						)
						await modelSub.save(trx)
						break

					default:
						break
				}

				await trx.commit()

				resolve({ sign: modelSign.toJSON(), signPai: modelSub.toJSON() })

				if (
					lodash.isEmpty(modelSign.arquivo) &&
					modelSign.status === 'Manual'
				) {
					let resPDF = null
					switch (modelSign.tipo) {
						case 'Requerimento de Inscrição':
							//if (lodash.isEmpty(modelSign.arquivo)) {
							resPDF =
								await new ServiceFichaInscricao().criarDocumentoEmPdf({
									sign_id: modelSign.id,
									isAssinar: false,
									tipo: 'Requerimento de Inscrição',
								})
							//}
							break

						case 'Requerimento de Adesão':
							//if (lodash.isEmpty(modelSign.arquivo)) {
							resPDF = await new ServiceAdesao().criarDocumentoEmPdf({
								sign_id: modelSign.id,
								isAssinar: false,
								tipo: 'Requerimento de Adesão',
							})
							//}
							break
					}
				}
			} catch (e) {
				await trx.rollback()
				reject(e)
			}
		})
	}

	async criarDocumentoEmPdf(sign_id = null, isAssinar = false, tipo = null) {
		try {
			switch (tipo) {
				case 'Requerimento de Substituição':
					resPDF = await new ServiceSubstituicao().criarDocumentoEmPdf({
						sign_id,
						isAssinar,
						tipo,
					})

					break

				case 'Substituição de equipamento':
					resPDF = await new ServiceBaixa().criarDocumentoEmPdf({
						sign_id,
						isAssinar,
						tipo,
					})

					break
			}
		} catch (error) {}
	}

	async update(payload) {
		let trx = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}
			const modelSign = await Model.findOrFail(payload.id, trx)
			if (
				modelSign.status !== 'Enviado para assinatura' &&
				modelSign.status !== 'Pendente' &&
				modelSign.status !== 'Manual' &&
				modelSign.status !== 'Iniciado'
			) {
				throw {
					success: false,
					message: 'Não é permitido alterar este documento.',
				}
			}

			modelSign.merge({
				signatarioCpf: payload.signatarioCpf,
				signatarioDNasc: payload.signatarioDNasc,
				signatarioEmail: payload.signatarioEmail,
				signatarioNome: payload.signatarioNome,
				signatarioTel: payload.signatarioTel,
				dispositivo: payload.dispositivo,
				status: payload.status,
				assinatura: payload.assinatura,
				dataDoc: payload.dataDoc,
			})

			await modelSign.save(trx)
			await trx.commit()

			if (modelSign.status === 'Manual') {
				let resPDF = null
				switch (modelSign.tipo) {
					case 'Requerimento de Inscrição':
						//if (lodash.isEmpty(modelSign.arquivo)) {
						resPDF =
							await new ServiceFichaInscricao().criarDocumentoEmPdf({
								sign_id: modelSign.id,
								isAssinar: false,
								tipo: 'Requerimento de Inscrição',
							})
						//}
						break

					case 'Requerimento de Adesão':
						//if (lodash.isEmpty(modelSign.arquivo)) {
						resPDF = await new ServiceAdesao().criarDocumentoEmPdf({
							sign_id: modelSign.id,
							isAssinar: false,
							tipo: 'Requerimento de Adesão',
						})
						//}
						break
				}
			}

			return modelSign
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async updateStatus(payload) {
		let trx = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}
			const modelSign = await Model.findOrFail(payload.id, trx)
			if (modelSign.status !== 'Pendente' && modelSign.status !== 'Manual') {
				throw {
					success: false,
					message: 'Não é permitido alterar o status deste documento.',
				}
			}

			modelSign.merge({
				status: payload.status,
			})

			await modelSign.save(trx)
			await trx.commit()

			return modelSign
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async cancelar(ID) {
		let trx = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			let modelSub = null

			const modelSign = await Model.findOrFail(ID)
			if (modelSign.status === 'Documento assinado') {
				throw {
					success: false,
					message: 'Não é permitido cancelar um documento assinado.',
				}
			}

			modelSign.merge({ status: 'Cancelado' })

			switch (modelSign.tipo) {
				case 'Requerimento de Inscrição':
					modelSub = await ModelPessoaSign.findBy({
						sign_id: modelSign.id,
					})
					break

				case 'Requerimento de Adesão':
					modelSub = await ModelEquipamentoSign.findBy({
						sign_id: modelSign.id,
					})
					break
			}

			await modelSign.save(trx)
			await trx.commit()

			return { sign: modelSign.toJSON(), signPai: modelSub.toJSON() }
		} catch (e) {
			await trx.rollback()
			throw { success: false, message: e.message }
		}
	}

	async enviarToken(ID_ENCRYPT) {
		let envioError = false
		try {
			const sign_id_encrypt = ID_ENCRYPT
			let oDecrypt = this.decrypt(`${sign_id_encrypt}`) // Encryption.decrypt(sign_id)
			let sign_id = oDecrypt.id
			//let digito = oDecrypt.cpf

			const modelSign = await Model.find(sign_id)

			if (!modelSign) {
				throw { message: 'Assinatura não encontrada.', success: false }
			}

			if (modelSign.status !== 'Enviado para assinatura') {
				throw {
					mensagem: 'Não foi possível gerar o token.',
					status: modelSign.status,
					success: false,
				}
			}

			if (lodash.isEmpty(modelSign.token)) {
				modelSign.merge({
					token: this.getGerarTokenRandomico(1000, 9999),
					validate: moment(new Date()).add(5, 'day').format(),
				})
				await modelSign.save()
			}

			if (modelSign.dispositivo === 'email') {
				envioError = true
				const assunto = 'Token: Token de validação de assinatura'
				const mail = await Mail.send(
					'emails.sign_token_assinatura',
					modelSign.toJSON(),
					message => {
						message
							.to(modelSign.signatarioEmail)
							.from(URL_SERVIDOR_SIGN_EMAIL)
							.subject(assunto)
						//.attach(Helpers.tmpPath('ACBr/pdf/boleto_50173.pdf'))
						//.embed(Helpers.publicPath('images/logo-abpac.png'), 'logo')
					}
				)

				envioError = false

				await ModelSignLog.create({
					sign_id: modelSign.id,
					tipoEnvio: 'email',
					isLog: true,
					hostname: modelSign.link,
					descricao: `Token de confirmação de assinatura de documento enviado para ${modelSign.signatarioNome} (${modelSign.signatarioEmail})`,
				})
			}

			if (modelSign.dispositivo === 'sms') {
				envioError = true

				let tel = modelSign.signatarioTel.replace(/\D/g, '')
				//let msg = `<ABPAC> Token ${modelSign.token}`
				let msg = `<Token - ABPAC> Use o código ${token}`

				let sms = await factory().Servico(Env.get('SMS_SERVICO'))
				const result = await sms.enviar({
					numero: tel,
					mensagem: msg,
					identificador: modelSign.id,
					flash: true,
				})

				if (result.status === '0') {
					throw {
						message: result.msg,
						success: false,
					}
				}

				envioError = false

				const dNasc = moment(
					modelSign.signatarioDNasc,
					'YYYY-MM-DD'
				).format('DD/MM/YYYY')

				await ModelSignLog.create({
					sign_id: modelSign.id,
					tipoEnvio: 'sms',
					isLog: true,
					hostname: modelSign.link,
					descricao: `Token de confirmação de assinatura de documento enviado para o dispositivo ${modelSign.signatarioTel} - ${modelSign.signatarioNome}`,
				})
			}

			return { success: true, message: 'Token enviado com sucesso!' }
		} catch (e) {
			let mensagem = 'Ocorreu uma falha de transação'
			if (lodash.has(e, 'message')) {
				mensagem = e.message
			}
			if (lodash.has(e, 'mensagem')) {
				mensagem = e.mensagem
			}
			if (envioError) {
				mensagem = 'Ocorreu uma falha no envio do email.'
			}

			return { success: false, message: mensagem }
		}
	}

	async gerarDocumento(payload) {
		// Proxy
		// Parametros sign_id - tipo ("Requerimento Inscrição") - isAssinar

		let doc = null

		switch (payload.tipo) {
			case 'Requerimento de Inscrição':
				if (payload.isAssinar) {
					const sign_id_encrypt = payload.sign_id
					let oDecrypt = this.decrypt(`${sign_id_encrypt}`) // Encryption.decrypt(sign_id)
					let sign_id = oDecrypt.id
					payload.sign_id = sign_id
				}
				doc = await new ServiceFichaInscricao().criarDocumentoEmPdf(payload)
				break

			case 'Requerimento de Adesão':
				if (payload.isAssinar) {
					const sign_id_encrypt = payload.sign_id
					let oDecrypt = this.decrypt(`${sign_id_encrypt}`) // Encryption.decrypt(sign_id)
					let sign_id = oDecrypt.id
					payload.sign_id = sign_id
				}
				doc = await new ServiceAdesao().criarDocumentoEmPdf(payload)
				break

			case 'Requerimento de Substituição':
				if (payload.isAssinar) {
					const sign_id_encrypt = payload.sign_id
					let oDecrypt = this.decrypt(`${sign_id_encrypt}`) // Encryption.decrypt(sign_id)
					let sign_id = oDecrypt.id
					payload.sign_id = sign_id
				}
				doc = await new ServiceSubstituicao().criarDocumentoEmPdf(payload)
				break

			case 'Baixa Total de Equipamento':
				if (payload.isAssinar) {
					const sign_id_encrypt = payload.sign_id
					let oDecrypt = this.decrypt(`${sign_id_encrypt}`) // Encryption.decrypt(sign_id)
					let sign_id = oDecrypt.id
					payload.sign_id = sign_id
				}
				doc = await new ServiceBaixa().criarDocumentoEmPdf(payload)
				break

			default:
				break
		}

		return doc
	}

	async solicitarAssinatura(payload) {
		// Proxy
		// Parametros sign_id - tipo ("Requerimento Inscrição")
		try {
			let doc = null

			switch (payload.tipo) {
				case 'Requerimento de Inscrição':
					doc = await new ServiceFichaInscricao().solicitarAssinatura(
						payload.sign_id
					)
					break

				case 'Requerimento de Adesão':
					doc = await new ServiceAdesao().solicitarAssinatura(
						payload.sign_id
					)
					break

				case 'Requerimento de Substituição':
					doc = await new ServiceSubstituicao().solicitarAssinatura(
						payload.sign_id
					)
					break

				case 'Baixa Total de Equipamento':
					doc = await new ServiceBaixa().solicitarAssinatura(
						payload.sign_id
					)
					break

				default:
					break
			}

			return doc
		} catch (error) {
			throw error
		}
	}

	getGerarTokenRandomico(min, max) {
		// (1000, 9999)
		min = Math.ceil(min)
		max = Math.floor(max)
		return Math.floor(Math.random() * (max - min + 1)) + min
	}

	async pdf(sign_id, tipo, isBase64 = true) {
		try {
			const sign = await Model.findOrFail(sign_id)

			const arqAssinado = tipo === 'arquivo-assinado' ? 'a_' : ''
			let pasta = ''
			if (sign.tipo === 'Requerimento de Inscrição') {
				pasta = Helpers.tmpPath(`uploads/${arqAssinado}${sign.arquivo}`)
			}
			if (sign.tipo === 'Requerimento de Adesão') {
				pasta = Helpers.tmpPath(`uploads/${arqAssinado}${sign.arquivo}`)
			}
			if (sign.tipo === 'Requerimento de Substituição') {
				pasta = Helpers.tmpPath(`uploads/${arqAssinado}${sign.arquivo}`)
			}
			console.log(sign.arquivo)

			if (sign.arquivo) {
				let existe = await Drive.exists(pasta)

				if (existe) {
					if (isBase64) {
						const dt = fs.readFileSync(pasta, {
							encoding: 'base64',
							flag: 'r',
						})
						return dt
					} else {
						return pasta
					}
				} else throw { message: 'Arquivo PDF não localizado' }
			}
			throw { message: 'Arquivo PDF não localizado' }
		} catch (e) {
			throw e
		}
	}

	async localizar(payload) {
		try {
			const query = Model.query()

			let where = null

			if (payload.field_tipo_value) {
				query.where('tipo', payload.field_tipo_value)
			}

			switch (payload.field_name) {
				case 'signatarioNome':
					query.where('signatarioNome', 'like', `%${payload.field_value}%`)
					break

				case 'id':
					query.where('id', '=', payload.field_value)
					break

				default:
					break
			}

			switch (payload.field_status_value) {
				case 'Todos':
				case null:
					break

				case 'Pendente':
					query.whereIn('status', ['Pendente', 'Iniciado'])

				default:
					query.where('status', payload.field_status_value)
					break
			}

			const res = await query.fetch()

			return res
		} catch (e) {
			throw e
		}
	}

	encrypt(o) {
		const cpf = o.signatarioCpf.substring(0, 4)

		return `${cpf}${o.id}`
	}

	decrypt(hash) {
		if (!hash) return { id: null, cpf: '' }
		hash = hash.replace(/([^\d])+/gim, '')
		if (hash.lenght < 5) return { id: null, cpf: '' }
		return { id: hash.substr(4), cpf: hash.substring(0, 4) }
	}
}

module.exports = Sign
