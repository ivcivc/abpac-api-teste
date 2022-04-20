'use strict'
const PdfPrinter = require('pdfmake/src/printer')
const ModelEquipamento = use('App/Models/Equipamento')
const ModelEquipamentoSign = use('App/Models/EquipamentoSign')
const ModelSign = use('App/Models/Sign')
const ModelCategoria = use('App/Models/Categoria')
const ModelSignLog = use('App/Models/SignLog')
//const ModelBeneficio= use('App/Models/Beneficio')
const fs = require('fs')
const Helpers = use('Helpers')
const lodash = use('lodash')
const Database = use('Database')
const moment = require('moment')
moment.locale('pt-br')
const crypto = require('crypto')
const Env = use('Env')
const Mail = use('Mail')
const factory = use('App/Services/SMS/Factory')
const URL_SERVIDOR_SIGN_EMAIL = Env.get('URL_SERVIDOR_SIGN_EMAIL')
const StorageService = use('App/Services/Storage')
const BrM = require('br-masks')

class SubstituicaoController {
	moeda(n) {
		let c = new Intl.NumberFormat('de-DE').format(n)
		if (!c.includes(',')) {
			c = c + ',00'
		}
		return c
	}

	placaMask(c) {
		if (!c) return c

		let cc = ''

		if (c.length >= 7) {
			cc = c.substr(0, 3) + '-' + c.substring(3)
		}

		return cc
	}

	async criarDocumentoEmPdf(payload) {
		let trx = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			let file_id = null // ID dropbox

			let logs = []

			const pasta = Helpers.tmpPath('uploads/') //const pasta = Helpers.tmpPath('pre_cadastro/adesao/')

			const modelSign = await ModelSign.findOrFail(payload.sign_id)

			const sign = modelSign.toJSON()
			let equipa = JSON.parse(sign.dataJson) // arr

			if (!lodash.isArray(equipa)) {
				throw { message: 'Registro não encontrado para gerar PDF' }
			}

			if (equipa.lenght < 1) {
				throw { message: 'Registro não encontrado para gerar PDF' }
			}

			equipa = equipa[0]

			let arquivo = null

			if (payload.isAssinar) {
				if (sign.status !== 'Enviado para assinatura') {
					throw {
						mensagem: 'Documento não disponível para assinatura.',
						success: false,
					}
				}

				if (lodash.isEmpty(sign.arquivo)) {
					throw { mensagem: 'Arquivo PDF não localizado.', success: false }
				}

				if (lodash.isEmpty(sign.arquivo)) {
					arquivo = new Date().getTime() + '.pdf'
					modelSign.merge({ arquivo })
					arquivo = 'a_' + arquivo
				} else {
					arquivo = 'a_' + sign.arquivo
				}

				const fileBuffer = fs.readFileSync(pasta + sign.arquivo)
				const oHash = crypto.createHash('sha256')
				const hash = oHash.update(fileBuffer).digest('hex')
				sign.hash = hash

				modelSign.merge({
					hash,
					status: 'Documento assinado',
				})

				const novaData = new Date()

				await ModelSignLog.create(
					{
						created_at: novaData,
						sign_id: sign.id,
						tipoEnvio: '',
						ip: payload.ip,
						isLog: true,
						hostname: null,
						descricao: `Assinado por ${sign.signatarioNome} ${sign.dispositivo} (${sign.signatarioEmail}) IP: ${payload.ip}`,
					},
					trx
				)

				let modelLog = await ModelSignLog.query()
					.where('sign_id', sign.id)
					.where('isLog', true)
					.orderBy('created_at', 'asc')
					.fetch()
				logs = modelLog.rows
				logs.push({
					created_at: novaData.toJSON(),
					sign_id: sign.id,
					tipoEnvio: '',
					ip: payload.ip,
					isLog: true,
					hostname: null,
					descricao: `Assinado por ${sign.signatarioNome} ${sign.dispositivo} (${sign.signatarioEmail}) IP: ${payload.ip}`,
				})

				// Disponibilizar na Galeria
				const file = {
					modulo: 'Equipamento|requerimento-adesao',
					descricao: 'Requerimento de Adesão',
					dVencimento: null,
					idParent: equipa.id,
					pessoa_id: equipa.pessoa.id,
					status: 'Pendente',
					items: [
						{
							file: sign.arquivo,
							name: 'Original',
							path: '/' + sign.arquivo,
							type: 'application',
							subtype: 'pdf',
							key: 'pendente',
							status: 'Aprovado',
							isSignOriginal: true,
							sign_id: sign.id,
						},
						{
							file: arquivo,
							name: 'Assinado',
							path: '/' + arquivo,
							type: 'application',
							subtype: 'pdf',
							key: 'pendente',
							status: 'Aprovado',
							isSignOriginal: false,
							sign_id: sign.id,
						},
					],
				}

				const resFile = await new StorageService().addSign(file, trx)
				if (!resFile.success) {
					throw {
						success: false,
						message: resFile.message,
					}
				}
				file_id = resFile.file_id
				// fim galeria
			}

			if (!payload.isAssinar) {
				if (lodash.isEmpty(sign.arquivo)) {
					arquivo = new Date().getTime() + '.pdf'
				} else {
					arquivo = sign.arquivo
				}

				modelSign.merge({
					arquivo,
				})
			}

			let matricula = `${equipa.pessoa.id}`
			matricula = matricula.padStart(10, '0')
			let requerimento = `${payload.sign_id}`
			requerimento = requerimento.padStart(10, '0')

			const fonts = {
				Roboto: {
					normal:
						Helpers.publicPath('pdf/fonts/Roboto/') +
						'Roboto-Regular.ttf',
					bold:
						Helpers.publicPath('pdf/fonts/Roboto/') + 'Roboto-Medium.ttf',
					italics:
						Helpers.publicPath('pdf/fonts/Roboto/') + 'Roboto-Italic.ttf',
					bolditalics:
						Helpers.publicPath('pdf/fonts/Roboto/') +
						'Roboto-MediumItalic.ttf',
				},

				CourierNew: {
					normal: Helpers.publicPath(
						'pdf/fonts/Courrier/CourierNewRegular.ttf'
					),
					bold: Helpers.publicPath(
						'pdf/fonts/Courrier/CourierNewBold.ttf'
					),
					italics: Helpers.publicPath(
						'pdf/fonts/Courrier/CourierNewItalic.ttf'
					),
					bolditalics: Helpers.publicPath(
						'pdf/fonts/Courrier/CourierNewItalicBold.ttf'
					),
				},
			}

			const printer = new PdfPrinter(fonts)

			const content = [
				{
					columns: [
						{
							image: Helpers.publicPath('/images/logo-abpac.png'),
							width: 30,
							height: 60,
						},
						{
							layout: 'noBorders',
							table: {
								headerRows: 1,
								widths: ['*'],
								body: [
									[
										{
											text: 'TERMO DE REQUERIMENTO DE SUBSTITUIÇÃO DE VEÍCULO DO PLANO DE BENEFÍCIO DE ACIDENTES DE VEÍCULOS DA ABPAC',
											bold: true,
											fontSize: 13,
											alignment: 'center',
											margin: [15, 10, 0, 0],
										},
									],
									[
										{
											text: 'REQUERIMENTO Nº: ' + requerimento,
											fontSize: 11,
											alignment: 'center',
											margin: [0, 5, 0, 0],
										},
									],
								],
							},
						},
					],
				},
			]

			const cor = {
				cinzaClaro: '#f2f2f2',
			}

			content.push({
				layout: 'lightHorizontalLines',
				margin: [0, 1, 0, 0],
				table: {
					headerRows: 0,
					widths: ['*'],
					border: [true, true, false, false],
					body: [
						[{ text: 'DADOS DO ASSOCIADO', bold: true, fontSize: 12 }],
						[{ text: '' }],
					],
				},
			})

			content.push({
				layout: { defaultBorder: false },
				margin: [0, 0, 0, 0],
				border: [false, false, false, false],

				table: {
					headerRows: 0,

					widths: ['*', 3, 90],

					body: [
						[
							{
								text: 'NOME',
								bold: true,
							},
							{ text: '' },
							{
								text: 'CPF',
								bold: true,
								alignment: 'left',
							},
						],
						[
							{
								text: equipa.pessoa.nome.toUpperCase(),
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: BrM.cpfCnpj(equipa.pessoa.cpfCnpj),
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

			// Sai
			content.push({
				layout: 'lightHorizontalLines',
				margin: [0, 20, 0, 0],
				table: {
					headerRows: 0,
					widths: ['*'],
					border: [true, true, false, false],
					body: [
						[
							{
								text: 'VEÍCULO QUE SAI',
								bold: true,
								alignment: 'left',
								fontSize: 12,
							},
						],
						[{ text: '' }],
					],
				},
			})

			content.push({
				layout: { defaultBorder: false },
				margin: [0, 0, 0, 0],
				border: [false, false, false, false],

				table: {
					headerRows: 0,

					widths: ['*', 3, 90],

					body: [
						[
							{
								text: 'VEÍCULO',
								bold: true,
							},
							{ text: '' },
							{
								text: 'ANO/MODELO',
								bold: true,
								alignment: 'left',
							},
						],
						[
							{
								text: `${equipa.sai.marca1.toUpperCase()} ${equipa.sai.modelo1.toUpperCase()}`,
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: `${equipa.sai.anoF1} / ${equipa.sai.modeloF1}`,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
						],
						[
							{
								text: 'PLACA',
								bold: true,
							},
							{ text: '' },
							{
								text: 'CHASSI',
								bold: true,
								alignment: 'left',
							},
						],
						[
							{
								text: `${this.placaMask(
									equipa.sai.placa1.toUpperCase()
								)}`,
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: `${equipa.sai.chassi1}`,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

			// Entra
			content.push({
				layout: 'lightHorizontalLines',
				margin: [0, 20, 0, 0],
				table: {
					headerRows: 0,
					widths: ['*'],
					border: [true, true, false, false],
					body: [
						[
							{
								text: 'VEÍCULO QUE ENTRA',
								bold: true,
								alignment: 'left',
								fontSize: 12,
							},
						],
						[{ text: '' }],
					],
				},
			})

			const cabecalhoEntra = {
				layout: { defaultBorder: false },
				margin: [0, 0, 0, 0],
				border: [false, false, false, false],

				table: {
					headerRows: 0,

					widths: ['*', 3, 90],

					body: [],
				},
			}

			let addEntra = []

			addEntra.push([
				{
					text: 'VEÍCULO',
					bold: true,
				},
				{ text: '' },
				{
					text: 'ANO/MODELO',
					bold: true,
					alignment: 'left',
				},
			])

			addEntra.push([
				{
					text: `${equipa.entra.marca1.toUpperCase()} ${equipa.entra.modelo1.toUpperCase()}`,
					bold: false,
					fillColor: cor.cinzaClaro,
				},
				{ text: '' },
				{
					text: `${equipa.entra.anoF1} / ${equipa.entra.modeloF1}`,
					bold: false,
					alignment: 'left',
					fillColor: cor.cinzaClaro,
				},
			])

			/*addEntra.push([
				{
					text: 'PLACA(S)',
					bold: true,
				},
				{ text: '' },
				{
					text: 'CHASSI',
					bold: true,
					alignment: 'left',
				},
			])*/

			let placas = this.placaMask(equipa.entra.placa1.toUpperCase())
			let chassis = equipa.entra.chassi1.toUpperCase()

			if (equipa.entra.placa2) {
				placas =
					placas +
					' / ' +
					this.placaMask(equipa.entra.placa2.toUpperCase())
			}

			if (equipa.entra.placa3) {
				placas =
					placas +
					' / ' +
					this.placaMask(equipa.entra.placa3.toUpperCase())
			}

			if (equipa.entra.chassi2) {
				chassis = chassis + ' / ' + equipa.entra.chassi2.toUpperCase()
			}

			if (equipa.entra.chassi3) {
				chassis = chassis + ' / ' + equipa.entra.chassi3.toUpperCase()
			}

			/*addEntra.push([
				{
					text: `${placas}`,
					bold: false,
					fillColor: cor.cinzaClaro,
				},
				{ text: '' },
				{
					text: `${chassis}`,
					bold: false,
					alignment: 'left',
					fillColor: cor.cinzaClaro,
				},
			])

			addEntra.push([
				{
					text: 'VALOR INFORMADO',
					bold: true,
				},
				{ text: '' },
				{
					text: 'ENQUADRAMENTO',
					bold: true,
					alignment: 'left',
				},
			])*/

			const modelCategoria = await ModelCategoria.findOrFail(
				equipa.entra.categoria_id
			)

			/*addEntra.push([
				{
					text: `${this.moeda(equipa.entra.valorMercado1)}`,
					bold: false,
					fillColor: cor.cinzaClaro,
				},
				{ text: '' },
				{
					text: `${modelCategoria.abreviado}`,
					bold: false,
					alignment: 'left',
					fillColor: cor.cinzaClaro,
				},
			])*/

			cabecalhoEntra.table.body = addEntra
			content.push(cabecalhoEntra)

			// semi-reboque
			/*let equipa1 = `${equipa.entra.marca1} ${equipa.entra.modelo1} - Placa: ${equipa.entra.placa1}`
			let equipa2 = ''
			let semiReboques = equipa1 + equipa2
			if (equipa.entra.placa1) {
				content.push({
					layout: { defaultBorder: false },
					margin: [0, 0, 0, 0],
					border: [false, false, false, false],

					table: {
						headerRows: 0,

						widths: ['*'],

						body: [
							[
								{
									text: 'SEMI-REBOQUE',
									bold: true,
								},
							],
							[
								{
									text: semiReboques,
									bold: false,
									fillColor: cor.cinzaClaro,
								},
							],
						],
					},
				})
			}*/

			let beneficios = ''
			if (lodash.has(equipa.entra, 'equipamentoBeneficios')) {
				for (const key in equipa.entra.equipamentoBeneficios) {
					if (
						Object.hasOwnProperty.call(
							equipa.entra.equipamentoBeneficios,
							key
						)
					) {
						const b = equipa.entra.equipamentoBeneficios[key]
						if (b.status === 'Ativo') {
							let espaco = beneficios === '' ? '' : '  -  '
							let nr = parseInt(key) + 1
							beneficios +=
								espaco +
								`${nr}) ${b.beneficio.descricao} R$ ${this.moeda(
									b.beneficio.valor
								)}`
						}
					}
				}
			}

			// Placas
			content.push({
				layout: { defaultBorder: false },
				margin: [0, 0, 0, 0],
				border: [false, false, false, false],

				table: {
					headerRows: 0,

					widths: ['*'],

					body: [
						[
							{
								text: 'PLACA(S)',
								bold: true,
							},
						],
						[
							{
								text: placas,
								bold: false,
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})
			// Chassis
			content.push({
				layout: { defaultBorder: false },
				margin: [0, 0, 0, 0],
				border: [false, false, false, false],

				table: {
					headerRows: 0,

					widths: ['*'],

					body: [
						[
							{
								text: 'CHASSI(S)',
								bold: true,
							},
						],
						[
							{
								text: chassis,
								bold: false,
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

			// Beneficios
			content.push({
				layout: { defaultBorder: false },
				margin: [0, 0, 0, 0],
				border: [false, false, false, false],

				table: {
					headerRows: 0,

					widths: ['*'],

					body: [
						[
							{
								text: 'BENEFÍCIO(S)',
								bold: true,
							},
						],
						[
							{
								text:
									beneficios === ''
										? 'NÃO CONTRATADO'
										: beneficios.toUpperCase(),
								bold: false,
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

			// Valor de mercado / Enquadramento
			content.push({
				layout: { defaultBorder: false },
				margin: [0, 0, 0, 0],
				border: [false, false, false, false],

				table: {
					headerRows: 0,

					widths: ['*', 3, 90],

					body: [
						[
							{
								text: 'VALOR INFORMADO',
								bold: true,
							},
							{ text: '' },
							{
								text: 'ENQUADRAMENTO',
								bold: true,
								alignment: 'left',
							},
						],
						[
							{
								text: `${this.moeda(equipa.entra.valorMercado1)}`,
								bold: true,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: `${modelCategoria.abreviado}`,
								bold: true,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

			const texto1 = `Na condição de associado, venho requerer a substituição do veículo conforme descrição acima.
         `
			const texto2 = `Declaro ainda a ratificação de todos os compromissos já assumidos com a ABPAC quando assinei o termo de requerimento de adesão do veículo que aqui requeri a substituição, e, demais disposições legais contidas no nosso regimento interno, todas que ficam fazendo parte integrante do presente termo, cônscio de que todos estes compromissos e obrigações permanecem intactos.
         `
			const texto3 = `Tendo em vista o presente requerimento de substituição de veículo, para o mesmo especificamente, mais uma vez, declaro ter conhecimento total de que é minha obrigação, junto a ABPAC, comunicá-la sempre das substituições de equipamentos(s), mudança de enquadramento do bem, quanto aos agrupamentos dos equipamentos cadastrados, artigo 2º do regime interno, assumindo o ônus quanto a qualquer perda que venha sofrer em caso de acidente, furto e ou robo, isentando a ABPAC de qualquer responsabilidade, da mesma forma quanto ao meu ciente de que a ABPAC somente garantirá proteção ao(s) meu(s) equipamento(s), até o limite máximo previsto para os mesmos, conforme parágrafo 1º, do artigo 16, do regimento interno e, por consequência, assumo ser de minha inteira responsabilidade os valores excedentes caso existentes, eximindo assim a associação de qualquer ônus ou responsabilidade sobre o mesmo, da necessidade de os veículos estarem regularmente legalizado(s) junto ao DETRAN competente e de ter também instalados os equipamentos de rastreamento e bloqueador e que estejam estes equipamentos funcionando regularmente.
          `
			const texto4 = `Deverá o associado efetuar a instalação dos equipamentos obrigatórios (rastreador e bloqueador), de imediato, atendendo-se ao previsto no regimento interno.
         `
			const texto5 = `Quanto ao veículo substituído assumo neste ato a obrigação da imediata desinstalação dos equipamentos de rastreamento e bloqueador do veículo baixado, sob pena de não o fazendo, deverei ressarcir os valores dos mesmos à ABPAC, ficando a mesma desde já autorizada a emitir a respectiva cobrança, nos valores de R$ 1.550,00 (Hum mil e quinhentos e cinquenta reais), no caso do aparelho bloqueador e o valor de R$ 350,00 (Trezentos e cinquenta reais) do aparelho rastreador, tudo conforme o Regimento interno, mais precisamente, no artigo 6º, paragrafo 9º, inciso III, alínea "c".
         `

			content.push({
				margin: [0, 20, 0, 0],
				stack: [
					[
						{
							text: texto1,
							bold: false,
							fontSize: 8,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto2,
							bold: false,
							fontSize: 8,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto3,
							bold: false,
							fontSize: 8,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto4,
							bold: false,
							fontSize: 8,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto5,
							bold: false,
							fontSize: 8,
							font: 'Roboto',
							alignment: 'justify',
						},
					],
				],
				//},
			})

			content.push({
				margin: [0, 25, 0, 0],
				columns: [
					/*{
                  text: 'IVAN CARLSO',
               },*/
					{
						text:
							'Betim, ' +
							moment(sign.dataDoc, 'YYYY-MM-DD').format('LL'),
						width: 'auto',
					},
					{
						text: ' ',
						width: 25,
					},
					{
						image: Helpers.publicPath(
							'/images/assinaturas/associado-branco.png'
						),
						width: 140,
						// height: 60,
					},
					{
						text: ' ',
						width: 35,
					},
					{
						image: Helpers.publicPath(
							`/images/assinaturas/${sign.assinatura}`
						),
						width: 140,
						// height: 60,
					},
					/*{
                  image: Helpers.publicPath('/images/assinaturas/marcus.png'),
                  //width: '40%',
                  // height: 60,
               },*/
				],
			})

			if (payload.isAssinar) {
				content.push({
					layout: 'lightHorizontalLines',
					margin: [0, 20, 0, 0],
					table: {
						headerRows: 0,
						widths: ['*'],
						border: [false, false, false, false],
						body: [
							[
								{
									text: 'LOG',
									bold: true,
									fontSize: 16,
									headlineLevel: 1,
								},
							],
							[
								{
									margin: [0, 15, 0, 0],
									border: [false, false, false, false],
									bold: false,
									alignment: 'justify',
									fontSize: 14,
									text: `Arquivo: ${sign.arquivo}`,
								},
							],
							[
								{
									margin: [0, 0, 0, 0],
									border: [false, false, false, false],
									text: 'Documento nr. ' + sign.doc_id,
									bold: false,
									fontSize: 10,
								},
							],
						],
					},
				})

				content.push([
					{
						margin: [0, 25, 0, 0],
						bold: true,
						fontSize: 16,
						text: `Assinatura do contratante`,
					},
					{
						text: sign.signatarioNome,
						bold: false,
						fontSize: 10,
					},
				])

				content.push([
					{
						margin: [0, 20, 0, 0],
						bold: true,
						fontSize: 14,
						text: `Histórico`,
					},
				])

				let modelLog = await ModelSignLog.query()
					.where('sign_id', sign.id)
					.where('isLog', true)
					.orderBy('created_at', 'asc')
					.fetch()
				const logs = modelLog.rows

				logs.forEach((e, i) => {
					content.push({
						columns: [
							{
								width: 100,
								text: moment(
									e.created_at,
									'YYYY-MM-DD HH:mm:ss'
								).format('DD/MM/YYYY hh:mm:ss'),
								bold: false,
								fontSize: 10,
								margin: [0, i === 0 ? 10 : 10, 0, 0],
							},
							{
								width: 'auto',
								text: e.descricao,
								bold: false,
								fontSize: 10,
								margin: [0, i === 0 ? 10 : 10, 0, 0],
							},
						],
						columnGap: 10,
					})
				})

				// Hash - desabilitado
				/*content.push([
					{
						margin: [0, 25, 0, 0],
						bold: true,
						fontSize: 10,
						text: `Hash do documento original ` + sign.hash,
					},
				])*/
			}

			const docDefinition = {
				pageSize: 'A4',
				pageOrientation: 'portrait',

				defaultStyle: {
					fontSize: 8,
					bold: true,
					font: 'CourierNew',
				},

				footer: {
					columns: [
						{ text: 'DOC ID:' + sign.doc_id, alignment: 'right' },
						{ text: '', alignment: 'right' },
						//{ width: 'auto', text: 'Pagina 1', alignment: 'right' },
					],
				},

				content,
				pageBreakBefore: function (
					currentNode,
					followingNodesOnPage,
					nodesOnNextPage,
					previousNodesOnPage
				) {
					//if (currentNode.novaPagina === 1) {
					console.log('currentNode= ', currentNode)
					//}
					return currentNode.headlineLevel === 1
				},
			}

			const pdfDoc = printer.createPdfKitDocument(docDefinition)
			pdfDoc.pipe(fs.createWriteStream(pasta + arquivo))
			pdfDoc.end()

			await modelSign.save(trx)
			await trx.commit()

			if (payload.isAssinar) {
				//  Enviar arquivo pra Dropbox
				await new StorageService().SignAddKue(file_id)
			}

			return query.rows
		} catch (e) {
			let mensagem = 'Ocorreu uma falha de transação'
			if (lodash.has(e, 'message')) {
				mensagem = e.message
			}
			if (lodash.has(e, 'mensagem')) {
				mensagem = e.mensagem
			}

			return { message: mensagem, success: false }
		}
	}

	async solicitarAssinatura(sign_id) {
		let modelSign = null
		let mail = false
		let emailError = false

		let trx = null

		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			modelSign = await ModelSign.find(sign_id)
			if (
				modelSign.status !== 'Pendente' &&
				modelSign.status !== 'Enviado para assinatura'
			) {
				erroStatus = true
				throw {
					message:
						'Não foi possível solicitar a assinatura. Status incompativel.',
					success: false,
				}
			}

			if (lodash.isEmpty(modelSign.arquivo)) {
				const resPDF = await this.criarDocumentoEmPdf({
					sign_id: modelSign.id,
					isAssinar: false,
					tipo: 'Requerimento de Adesão',
				})
			}

			const URL_SERVIDOR_WEB = Env.get('URL_SERVIDOR_SIGN')
			const signJSON = modelSign.toJSON()
			const crypto_sign_id = this.encrypt(signJSON) //Encryption.encrypt(signJSON.id)
			signJSON.link = `${URL_SERVIDOR_WEB}/sign/${crypto_sign_id}`

			modelSign.merge({
				status: 'Enviado para assinatura',
				link: signJSON.link,
			})
			await modelSign.save(trx)

			const assunto = 'Assinar documento: Requerimento de Adesão'

			if (modelSign.dispositivo === 'email') {
				emailError = true

				mail = await Mail.send(
					'emails.sign_requerimento_adesao',
					signJSON,
					message => {
						message
							.to(modelSign.signatarioEmail)
							.from(URL_SERVIDOR_SIGN_EMAIL)
							.subject(assunto)
						//.attach(Helpers.tmpPath('ACBr/pdf/boleto_50173.pdf'))
						//.embed(Helpers.publicPath('images/logo-abpac.png'), 'logo')
					}
				)

				emailError = false

				const dNasc = moment(signJSON.signatarioDNasc, 'YYYY-MM-DD').format(
					'DD/MM/YYYY'
				)
				await ModelSignLog.create({
					sign_id: signJSON.id,
					tipoEnvio: 'email',
					isLog: true,
					hostname: signJSON.link,
					descricao: `Enviado para assinatura de ${signJSON.signatarioNome} (${signJSON.signatarioEmail}) CPF: ${signJSON.signatarioCpf} DATA NASC.: ${dNasc}`,
				})
			}

			if (modelSign.dispositivo === 'sms') {
				emailError = true

				let tel = modelSign.signatarioTel.replace(/\D/g, '')
				let msg = `A ABPAC enviou um documento (${modelSign.tipo}) para você assinar. Acesse o link ${signJSON.link}`

				let sms = await factory().Servico(Env.get('SMS_SERVICO'))
				const result = await sms.enviar({
					numero: tel,
					mensagem: msg,
					identificador: crypto_sign_id,
					flash: false,
				})

				if (result.status === '0') {
					throw {
						message: result.msg,
						success: false,
					}
				}

				emailError = false

				const dNasc = moment(signJSON.signatarioDNasc, 'YYYY-MM-DD').format(
					'DD/MM/YYYY'
				)

				await ModelSignLog.create({
					sign_id: signJSON.id,
					tipoEnvio: 'sms',
					isLog: true,
					hostname: signJSON.link,
					descricao: `Enviado para assinatura de ${signJSON.signatarioNome}, CPF: ${signJSON.signatarioCpf}, DATA NASC.: ${dNasc}, Dispositivo: ${signJSON.signatarioTel}`,
				})
			}

			await modelSign.save(trx)
			await trx.commit()

			const modelEquipamentoSign = await ModelEquipamentoSign.findBy(
				'sign_id',
				modelSign.id
			)

			/*const query = await ModelEquipamento.query()
				.where('preCadastro_id', modelEquipamentoSign.preCadastro_id)
				.with('equipamentoStatuses')
				.with('pessoa')
				.with('categoria')
				.with('equipamentoProtecoes')
				.with('equipamentoSigns.signs')
				.with('equipamentoBeneficios.beneficio')
				.with('equipamentoRestricaos')
				.fetch()*/

			//return query.rows[0]
			return {
				sign: modelSign.toJSON(),
				signPai: modelEquipamentoSign.toJSON(),
			}
		} catch (e) {
			let mensagem = 'Ocorreu uma falha de transação'
			if (lodash.has(e, 'mensagem')) {
				mensagem = e.mensagem
			}
			if (lodash.has(e, 'message')) {
				mensagem = e.message
			}

			return { message: mensagem }
		}
	}

	encrypt(o) {
		const cpf = o.signatarioCpf.substring(0, 4)

		return `${cpf}${o.id}`
	}
}

module.exports = SubstituicaoController
