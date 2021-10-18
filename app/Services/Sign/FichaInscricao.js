'use strict'
const PdfPrinter = require('pdfmake/src/printer')
const ModelPessoa = use('App/Models/Pessoa')
const ModelPessoaSign = use('App/Models/PessoaSign')
const ModelSign = use('App/Models/Sign')
const ModelSignLog = use('App/Models/SignLog')
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

class FichaInscricaoController {
	async criarDocumentoEmPdf(payload) {
		let trx = null
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			let file_id = null // ID dropbox

			let logs = []

			const pasta = Helpers.tmpPath('uploads/') //Helpers.tmpPath('pre_cadastro/inscricao/')

			const modelSign = await ModelSign.findOrFail(payload.sign_id)

			const sign = modelSign.toJSON()
			const pessoa = JSON.parse(sign.dataJson)
			let arquivo = null
			let preCadastro_id = null

			const modelPessoaSign = await ModelPessoaSign.findBy({
				sign_id: sign.id,
			})
			if (ModelPessoaSign) {
				preCadastro_id = modelPessoaSign.preCadastro_id
			}

			if (payload.isAssinar) {
				if (sign.status !== 'Enviado para assinatura') {
					throw {
						mensagem: 'Documento não disponível para assinatura.',
					}
				}

				if (payload.token !== sign.token) {
					throw { mensagem: 'Token inválido' }
				}

				if (lodash.isEmpty(sign.arquivo)) {
					throw { mensagem: 'Arquivo PDF não localizado.' }
				}

				if (lodash.isEmpty(sign.arquivo)) {
					arquivo = new Date().getTime() + '.pdf'
					modelSign.merge({ arquivo })
					arquivo = 'a_' + arquivo
				} else {
					arquivo = 'a_' + sign.arquivo
				}

				const fileBuffer = fs.readFileSync(pasta + sign.arquivo) // original
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
					modulo: 'Associado|requerimento-inscricao',
					descricao: 'Requerimento de Inscrição',
					dVencimento: null,
					idParent: pessoa.id,
					pessoa_id: pessoa.id,
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
					throw { success: false, message: resFile.message }
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

				if (!modelPessoaSign) {
					modelPessoaSign = await ModelPessoaSign.create(
						{
							pessoa_id: pessoa.id,
							sign_id: sign.id,
							preCadastro_id,
						},
						trx
					)
				}

				modelSign.merge({
					arquivo,
				})
			}

			// Iniciar criação do PDF
			const tels = {
				tel1: '',
				tel1Contato: '',
				tel2: '',
				tel2Contato: '',
				tel3: '',
				tel3Contato: '',
				tel4: '',
				tel4Contato: '',
			}
			const arrTels = []
			if (pessoa.telFixo) {
				arrTels.push({
					tel: pessoa.telFixo,
					contato: pessoa.telFixoContato,
				})
			}
			if (pessoa.telSms) {
				arrTels.push({ tel: pessoa.telSms, contato: pessoa.telSmsContato })
			}
			if (pessoa.telCelular) {
				arrTels.push({
					tel: pessoa.telCelular,
					contato: pessoa.telCelularContato,
				})
			}
			arrTels.forEach((e, i) => {
				tels[`tel${i + 1}`] = e.tel
				tels[`tel${i + 1}Contato`] = e.contato
			})

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
											text: 'REQUERIMENTO DE INSCRIÇÃO ABPAC PARA ASSOCIADO',
											bold: true,
											fontSize: 13,
											alignment: 'center',
											margin: [0, 10, 0, 0],
										},
									],
									[
										{
											text: 'MATRÍCULA: ' + pessoa.matricula,
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
				margin: [0, 20, 0, 0],
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
								text: 'CPF/CNPJ',
								bold: true,
								alignment: 'left',
							},
						],
						[
							{
								text: pessoa.nome.toUpperCase(),
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: pessoa.cpfCnpj,
								bold: false,
								alignment: 'right',
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

			content.push({
				layout: { defaultBorder: false },
				margin: [0, 0, 0, 0],
				border: [false, false, false, false],

				table: {
					headerRows: 0,

					widths: [75, 3, 55, 3, '*'],

					body: [
						[
							{
								text: 'D. NASCIMENTO',
								bold: true,
							},
							{ text: '' },
							{
								text: 'SEXO',
								bold: true,
								alignment: 'left',
							},
							/*{ text: '' },
                     {
                        text: 'ESTADO CIVIL',
                        bold: true,
                        alignment: 'left',
                     },*/
							{ text: '' },
							{
								text: 'EMAIL',
								bold: true,
								alignment: 'left',
							},
						],
						[
							{
								text: pessoa.dNasc,
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: pessoa.sexo,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
							/*{ text: '' },
                     {
                        text: '',
                        bold: false,
                        alignment: 'right',
                        fillColor: cor.cinzaClaro,
                     },*/
							{ text: '' },
							{
								text: pessoa.email,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

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
								text: 'NOME DO RESPONSÁVEL',
								bold: true,
							},
						],
						[
							{
								text: pessoa.responsavel,
								bold: false,
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

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
								text: 'ENDEREÇO PARA CORRESPONDENCIA',
								bold: true,
							},
						],
						[
							{
								text: pessoa.endRua,
								bold: false,
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

			content.push({
				layout: { defaultBorder: false },
				margin: [0, 0, 0, 0],
				border: [false, false, false, false],

				table: {
					headerRows: 0,

					widths: ['*', 3, 200, 3, 25, 3, 50],

					body: [
						[
							{
								text: 'BAIRRO',
								bold: true,
							},
							{ text: '' },
							{
								text: 'CIDADE',
								bold: true,
								alignment: 'left',
							},
							{ text: '' },
							{
								text: 'UF',
								bold: true,
								alignment: 'left',
							},
							{ text: '' },
							{
								text: 'CEP',
								bold: true,
								alignment: 'left',
							},
						],
						[
							{
								text: pessoa.endBairro,
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: pessoa.endCidade,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: pessoa.endEstado,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: pessoa.endCep,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

			content.push({
				layout: 'lightHorizontalLines',
				margin: [0, 25, 0, 0],
				table: {
					headerRows: 0,
					widths: ['*'],
					border: [true, true, false, false],
					body: [
						[
							{
								text: 'TELEFONES DE CONTATO',
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

					widths: [90, 3, '*', 10, 90, 3, '*'],

					body: [
						[
							{
								text: 'NÚMERO',
								bold: true,
							},
							{ text: '' },
							{
								text: 'CONTATO',
								bold: true,
								alignment: 'left',
							},
							{ text: '' },
							{
								text: 'NÚMERO',
								bold: true,
								alignment: 'left',
							},
							{ text: '' },
							{
								text: 'CONTATO',
								bold: true,
								alignment: 'left',
							},
						],
						[
							{
								text: tels.tel1,
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: tels.tel1Contato,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: tels.tel2,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: tels.tel2Contato,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

			/*content.push({
				layout: { defaultBorder: false },
				margin: [0, 5, 0, 0],
				border: [false, false, false, false],

				table: {
					headerRows: 0,

					widths: [90, 3, '*', 10, 90, 3, '*'],

					body: [
						[
							{
								text: 'NÚMERO',
								bold: true,
							},
							{ text: '' },
							{
								text: 'CONTATO',
								bold: true,
								alignment: 'left',
							},
							{ text: '' },
							{
								text: 'NÚMERO',
								bold: true,
								alignment: 'left',
							},
							{ text: '' },
							{
								text: 'CONTATO',
								bold: true,
								alignment: 'left',
							},
						],
						[
							{
								text: tels.tel3,
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: tels.tel3Contato,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: tels.tel4,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: tels.tel4Contato,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})*/

			content.push({
				layout: 'lightHorizontalLines',
				margin: [0, 20, 0, 0],
				table: {
					headerRows: 0,
					widths: ['*'],
					border: [false, false, false, false],
					body: [
						[{ text: 'DECLARAÇÃO', bold: true, fontSize: 12 }],
						[
							{
								margin: [0, 10, 0, 0],
								border: [false, false, false, false],
								bold: false,
								alignment: 'justify',
								fontSize: 9,
								text: `Declaro conhecer e concordar com todas as disposições legais, estatutárias e regimentais da ABPAC, principalmente quanto às cláusulas do Estatuto Social e Regimento Interno desta associação, comprometendo-me respeitar e zelar pelo integral e efetivo cumprimento de todas elas, tendo neste ato, recebido cópia dos mesmos.`,
							},
						],
						[
							{
								border: [false, false, false, false],
								bold: false,
								alignment: 'justify',
								fontSize: 9,
								text: `Declaro ainda ter conhecimento pleno de que, por força do meu requerimento de inscrição como associado ABPAC, assumo doravante a obrigação de pagar mensalmente a taxa de administração, bem como quaisquer outros valores que vierem a ser apresentados pela ABPAC, em contrapartida de benefícios eu venha usufruir na mesma, cujo vencimentos ocorrerão na data por mim escolhida.`,
							},
						],
						[
							{
								border: [false, false, false, false],
								bold: false,
								alignment: 'justify',
								fontSize: 9,
								text: `Declaro saber que a ABPAC disponibiliza dentre vários benefícios gerados ao associado, a Assistência 24  horas, seguro de vida, seguro de acidentes pessoais e reparação de danos contra terceiros, cuja contratação com a ABPAC é facultativa, porém tendo conhecimento de que, caso não os possua, assumo todas as consequências e prejuízos advindos ao(s) meu(s) equipamento(s) em caso de acidente, furto, roubo, isentando a ABPAC de qualquer responsabilidade.`,
							},
						],
						[
							{
								border: [false, false, false, false],
								bold: false,
								alignment: 'justify',
								fontSize: 9,
								text: `Tendo também conhecimento pleno, declarando expressamente que cso me torne inadimplente com quaisquer das obrigações assumidas com a ABPAC, além das penalidades e consequências previstas no Estatuto Social e Regimento Interno, fica desde já esta instituição, por seus representantes legais, autorizada a encaminhar os boletos bancários não pagos a protesto, assim como encaminhar meu nome às empresas de inforações cadastrais (SERASA, SPC E OUTRAS), para que seja nelas incluso.`,
							},
						],
						[
							{
								border: [false, false, false, false],
								bold: false,
								alignment: 'justify',
								fontSize: 9,
								text: `Por fim declaro autorizar a ABPAC a promover extrajudicial ou judicialmente, a cobrança de todos e quaisquer débitos de minha responsabilidade aqui assumidos, que após vencidos, não estejam pagos, que serão automaticamente acrescidos de despesas processuais, custas judiciais e honorários advocatícios, que serão de 10% (dez por cento) para as cobranças e ou 20% (vinte por cento) para cobranças judiciais.`,
							},
						],
					],
				},
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

				/*const logs = [
               {
                  createdAt: '02 dez 2020, 15:10:45',
                  descricao:
                     'Operador com email delta@testedeemail.com.br na conta 4569899a333080984 criou este documento numero 34509908add9908009das3. Data limite para assinatura do documento: 12 de dezembro de 2020 (15:30). Finalização automática após a ultima assinatua habilidada.',
               },
               {
                  createdAt: '03 dez 2020, 15:10:45',
                  descricao:
                     'Operador com email delta@testedeemail.com.br na conta 4569899a333080984 criou este documento numero 34509908add9908009das3. Data limite para assinatura do documento: 12 de dezembro de 2020 (15:30). Finalização automática após a ultima assinatua habilidada.',
               },
               {
                  createdAt: '04 dez 2020, 15:10:45',
                  descricao:
                     'Operador com email delta@testedeemail.com.br na conta 4569899a333080984 criou este documento numero 34509908add9908009das3. Data limite para assinatura do documento: 12 de dezembro de 2020 (15:30). Finalização automática após a ultima assinatua habilidada.',
               },
               {
                  createdAt: '05 dez 2020, 15:10:45',
                  descricao:
                     'Operador com email delta@testedeemail.com.br na conta 4569899a333080984 criou este documento numero 34509908add9908009das3. Data limite para assinatura do documento: 12 de dezembro de 2020 (15:30). Finalização automática após a ultima assinatua habilidada.',
               },
            ]*/

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

				// Hash - desabilitar
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
					fontSize: 9,
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
			console.log('=> ', pasta + arquivo)

			pdfDoc.on('end', t => {
				//console.log('terminou.', t)
				/*response
               .header('Content-type', 'application/pdf')
               .download(pasta + arquivo)*/
			})

			/* await pessoa.load('pessoaSigns', builder => {
           builder.with('signs')
         })*/

			await modelSign.save(trx)
			await trx.commit()

			const modelPessoa = await ModelPessoa.find(pessoa.id)
			await modelPessoa.load('pessoaSigns.signs')

			if (payload.isAssinar) {
				//  Enviar arquivo pra Dropbox
				await new StorageService().SignAddKue(file_id)
			}

			/*const res = await ModelPessoa.query()
            .where('id', pessoa_id)
            .with('pessoaSigns', builder => {
               builder.with('signs')
            })
            .fetch()*/

			if (payload.isAssinar) {
				return modelPessoa
			} else {
				return modelPessoa
			}
		} catch (e) {
			await trx.rollback()

			throw {
				success: false,
				message: e.mensagem ? e.mensagem : e.message,
			}
		}
	}

	async solicitarAssinatura(sign_id) {
		let modelSign = null
		let mail = false
		let emailError = false
		let erroStatus = false

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
				}
			}

			if (lodash.isEmpty(modelSign.arquivo)) {
				const resPDF = await this.criarDocumentoEmPdf({
					sign_id: modelSign.id,
					isAssinar: false,
					tipo: 'Requerimento de Inscrição',
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

			const assunto = 'Assinar documento: Requerimento de Inscrição'

			if (modelSign.dispositivo === 'email') {
				emailError = true

				mail = await Mail.send(
					'emails.sign_ficha_inscricao',
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

			const modelPessoaSign = await ModelPessoaSign.findBy(
				'sign_id',
				modelSign.id
			)

			await modelSign.save(trx)
			await trx.commit()

			const pessoa = await ModelPessoa.find(modelPessoaSign.pessoa_id)
			await pessoa.load('pessoaSigns.signs')

			return pessoa
		} catch (e) {
			let mensagem = 'Ocorreu uma falha de transação'
			if (lodash.has(e, 'mensagem')) {
				mensagem = e.mensagem
			}
			if (lodash.has(e, 'message')) {
				mensagem = e.message
			}

			throw { message: mensagem }
		}
	}

	encrypt(o) {
		const cpf = o.signatarioCpf.substring(0, 4)

		return `${cpf}${o.id}`
	}
}

module.exports = FichaInscricaoController
