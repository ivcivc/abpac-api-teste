'use strict'
const Helpers = use('Helpers')
const fs = require('fs')
const Drive = use('Drive')
const PrintTicket = use('App/Services/etiqueta') //require("print-tag/lib")

class EtiquetaController {
	async endereco({ request, response }) {
		try {
			return new Promise(async (resolve, reject) => {
				let pt = new PrintTicket('pimaco_6080')

				const { isTeste } = request.only('isTeste')
				let data = request.only('lista').lista

				if (isTeste) {
					data = this.dadosFake()
				}

				for (const key in data) {
					const e = data[key]
					e.nome = e.nome === null ? '' : e.nome
					e.endRua = e.endRua === null ? '' : e.endRua
					e.endBairro = e.endBairro === null ? '' : e.endBairro
					e.endComplemento =
						e.endComplemento === null ? '' : e.endComplemento
					e.endCidade = e.endCidade === null ? '' : e.endCidade
					e.endCep = e.endCep === null ? '' : e.endCep
					e.cpfCnpj = e.cpfCnpj === null ? '' : e.cpfCnpj
				}

				// write in test/results/output.pdf , see PDFkit documentation
				pt.doc.pipe(fs.createWriteStream(Helpers.tmpPath('etiqueta.pdf')))
				pt.doc.fontSize(8)

				pt.makeTickets(
					{
						count: data.length,
					},
					function onSetOneTag(i, marginLeft, marginTop, size, next) {
						// write something in tag area
						if (data[i].nome !== '') {
							const endEndereco =
								data[i].endRua +
								' ' +
								data[i].endComplemento +
								' ' +
								data[i].endBairro

							pt.doc.text(
								data[i].nome,
								marginLeft + 1,
								marginTop + 6,
								size
							)
							pt.doc.text(
								'CPF: ' + data[i].cpfCnpj,
								marginLeft + 1,
								marginTop + 17,
								size
							)
							pt.doc.text(
								endEndereco,
								marginLeft + 1,
								marginTop + 29,
								size
							)
							pt.doc.text(
								data[i].endCidade + ' / ' + data[i].endEstado,
								marginLeft + 1,
								marginTop + 51,
								size
							)
							pt.doc.text(
								data[i].endCep,
								marginLeft + 1,
								marginTop + 61,
								size
							)
						}

						// ticket box
						pt.doc.lineWidth(0.0)
						pt.doc
							.rect(marginLeft, marginTop, size.width, size.height)
							.stroke()
						// run next function
						next()
					},
					async function afterSetAllTags() {
						// end, required for end / finish the PDF file
						console.log('afterSetAllTags')
						pt.doc.end()
					}
				)

				pt.doc.on('end', () => {
					//done();
					console.log('end')
					resolve(true)
				})
			})
		} catch (e) {
			response.status(200).send(false)
		}
	}

	async pdf({ response }) {
		try {
			let pasta = Helpers.tmpPath('/')
			let arquivo = 'etiqueta.pdf'

			let existe = await Drive.exists(pasta + arquivo)

			if (existe) {
				return response
					.header('Content-type', 'application/pdf')
					.download(pasta + arquivo)
			}
			throw { success: false }
		} catch (error) {
			response.status(400).send({ success: false })
		}
	}

	dadosFake() {
		return [
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Cristiano Prazeres de Oliveira',
				endRua: 'Rua Ariovaldo Luciano Pinho, 155',
				endComplemento: 'apto 502',
				endBairro: 'Jd. Petropolis',
				endCidade: 'Betim',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'João Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar Damasco Oliveira Andrade a, 55',
				endComplemento: 'apto 502 bloco 300',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
			{
				nome: 'Ivan Carlos Araujo de Oliveira',
				endRua: 'Rua doutor Lucídio Avelar, 55',
				endComplemento: 'apto 502',
				endBairro: 'Buritis',
				endCidade: 'Belo Horizonte',
				endEstado: 'MG',
				endCep: '30.493-165',
				cpfCnpj: '872.750.906-00',
			},
		]
	}
}

module.exports = EtiquetaController
