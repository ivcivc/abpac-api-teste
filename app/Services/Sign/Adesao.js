'use strict'
const PdfPrinter = require('pdfmake/src/printer')
const ModelEquipamento = use('App/Models/Equipamento')
const ModelEquipamentoSign = use('App/Models/EquipamentoSign')
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

class AdesaoController {
	moeda(n) {
		let c = new Intl.NumberFormat('de-DE').format(n)
		if (!c.includes(',')) {
			c = c + ',00'
		}
		return c
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
			const equipa = JSON.parse(sign.dataJson)
			let arquivo = null
			let preCadastro_id = null

			let modelEquipamentoSign = await ModelEquipamentoSign.findBy({
				sign_id: sign.id,
			})
			if (modelEquipamentoSign) {
				preCadastro_id = modelEquipamentoSign.preCadastro_id
			}

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

				let modelEquipamentoSign = await ModelEquipamentoSign.create(
					{
						equipamento_id: equipa.id,
						sign_id: modelSign.id,
						preCadastro_id,
					},
					trx
				)

				modelSign.merge({
					arquivo,
				})
			}

			let matricula = `${equipa.pessoa.id}`
			matricula = matricula.padStart(10, '0')
			let requerimento = `${equipa.id}`
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
											text: 'REQUERIMENTO PARA CADASTRAMENTO DE EQUIPAMENTO(S) AO PLANO DE BENEFÍCIO DE RATEIO DE RESSARCIMENTO DE DESPESAS POR FURTO, ROUBO E ACIDENTE DE VEÍCULOS',
											bold: true,
											fontSize: 13,
											alignment: 'center',
											margin: [15, 10, 0, 0],
										},
									],
									[
										{
											text: 'MATRÍCULA: ' + requerimento,
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
								text: equipa.pessoa.cpfCnpj,
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

					widths: ['*', 3, '*'],

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
								text: `${equipa.marca1.toUpperCase()} ${equipa.modelo1.toUpperCase()}`,
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: `${equipa.anoF1}/${equipa.modeloF1}`,
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

					widths: ['*', 3, '*'],

					body: [
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
								text: `${equipa.placa1} ${
									equipa.placa2 ? equipa.placa2 : ''
								}`,
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: `${equipa.chassi1}`,
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

					widths: ['*', 3, '*'],

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
								text: this.moeda(equipa.valorMercado1),
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: `${equipa.categoria.tipo} (${equipa.categoria.abreviado})`,
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

			const oBeneficio = {
				b1: { descricaoPlano: 'NÃO CONTRATADO' },
				b2: { descricaoPlano: 'NÃO CONTRATADO' },
				b3: { descricaoPlano: 'NÃO CONTRATADO' },
				b4: { descricaoPlano: 'NÃO CONTRATADO' },
			}
			let contador = 0
			equipa.equipamentoBeneficios.forEach(e => {
				if (e.status === 'Ativo' && contador <= 4) {
					contador += 1
					e.descricaoPlano =
						'PLANO: ' + e.beneficio.descricao.toUpperCase()
					oBeneficio[`b${contador}`] = e
				}
			})

			content.push({
				layout: { defaultBorder: false },
				margin: [0, 5, 0, 0],
				border: [false, false, false, false],

				table: {
					headerRows: 0,

					widths: ['*', 3, '*'],

					body: [
						[
							{
								text: 'BENEFICIO',
								bold: true,
							},
							{ text: '' },
							{
								text: 'BENEFICIO',
								bold: true,
								alignment: 'left',
							},
						],
						[
							{
								text: oBeneficio.b1
									? oBeneficio.b1.descricaoPlano
									: ' ',
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: oBeneficio.b2
									? oBeneficio.b2.descricaoPlano
									: ' ',
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
						],
						[
							{
								text: 'BENEFICIO',
								bold: true,
							},
							{ text: '' },
							{
								text: 'BENEFICIO',
								bold: true,
								alignment: 'left',
							},
						],
						[
							{
								text: oBeneficio.b3
									? oBeneficio.b3.descricaoPlano
									: ' ',
								bold: false,
								fillColor: cor.cinzaClaro,
							},
							{ text: '' },
							{
								text: oBeneficio.b4
									? oBeneficio.b4.descricaoPlano
									: ' ',
								bold: false,
								alignment: 'left',
								fillColor: cor.cinzaClaro,
							},
						],
					],
				},
			})

			const texto1 = `Pelo presente termo de adesão, na condição de associado desta instituição, expresso minha livre vontade em requerer a adesão do meu(s) veículo(s) aqui descrito(s), para usufruir, além dos benefícios e serviços prestados pela ABPAC, também neste caso específico, do benefício do Plano de Benefício de Rateio para Ressarcimento de Despesas por Furto, Roubo e Acidentes de veículos, nos termos do regimento interno.
         `
			const texto2 = `Declaro que assumo o compromisso de pagar os valores de rateio, por participar do Plano de Benefício de Rateio para Ressarcimento de Despesas por Furto, Roubo e Acidente de Veículos desta associação, cujas obrigações aqui assumidas, vencem no dia por mim escolhido, artigo 6º, parágrafo 24º, e, que o não pagamento destas obrigações aqui assumidas, nas datas previstas, porei ter meu(s) equipamentos(s) excluído do citado plano.
         `
			const texto3 = `Declaro do mesmo modo aceitar as condições previstas no Regimento Interno reguladoras do pedido de baixa de meu(s) equipamento(s), cadastrado(s)o Plano de Benefício de Rateio para Ressarcimento de Despesas por Furto, Roubo e Acidente de Veículos, que ocorrerá sempre conforme as disposições do artigo 6º parágrafo 24º, inciso IV, alínea "a" do regimento interno, permanecendo eu obrigado ao pagamento das obrigações pecuniárias assumidas com esta associação conforme regulamentado no citado dispositivo legal.
         `
			const texto4 = `Declaro ter conhecimento total que é minha obrigação, junto a ABPAC, comunicá-la sempre das substituições de equipamento(s), mudança de enquadramento do bem, quanto aos agrupamentos dos equipamentos cadastrados, artigo 2º do regimento interno, assumindo o ônus quanto a qualquer perda que venha sofrer em caso de acidente, furto e ou roubo, isentando a ABPAC de qualquer responsabilidade.
         `
			const texto5 = `Declaro também estar ciente que a ABPAC somente garantirá proteção ao(s) meu(s) equipamento(s), até o limite máximo previsto para os mesmos, conforme parágrafo 1º, do artigo 16, do regimento interno e, por consequência, assumo ser de minha inteira responsabilidade os valores excedentes caso existentes, eximindo assim a associação de qualquer ônus ou responsabilidade sobre o mesmo.
         `
			const texto6 = `Declaro ser conhecedor de que para receber possível indenização quanto ao meu(s) equipamento(s) integrante ao Plano de Benefício de Rateio para Ressarcimento de Despesas por Furto, Roubo e Acidente de Veículo, no(s) mesmo(s) deverá(ão), além de estarem regularmente legalizado(s) junto ao DETRAN competente, ter também instalados os equipamentos de rastreamento e bloqueador e que estejam estes equipamentos funcionando regularmente.
         `
			const texto7 = `Declaro ter conhecimento e consciência de que sendo meu(s) equipamento(s) portador(es) de restrições, conforme parágrafo 6º, do artigo 7º, em caso de vir(em) o(s) mesmo(s) a envolver(em) em acidente, furto, roubo e gerem indenização integral,tal(is) equipamento(s) perderá(ão) 30% do seu valor de mercado.
         `
			const texto8 = `Declaro expressamente ser sabedor de que sou o único responsável para acompanhar os lançamentos de montas no(s) meu(s) equipamento(s) em consequência de acidente, desde a elaboração do boletim de ocorrência e em todas as demais instâncias quanto a lançamentos, baixas, defesas, e quaisquer outros procedimentos necessários, excluída a ABPAC de qualquer responsabilidade quanto as tais obrigações, conforme previsto no artigo 13º e alíneas do regimento interno.
         `
			const texto9 = `Declaro do mesmo modo que não tendo eu contratado a assistência 24 horas, ou esteja inadimplente, ou por qualquer outro motivo que a seguradora ou a empresa prestadora do referido serviço, não preste o atendimento desta cobertura, será de minha inteira responsabilidade os custos totais gerados pela remoção/deslocamento do equipamento, desde o local do acidente até a entrado do veículo na oficina de escolha ABPAC, onde serão feitos os serviços.
         `
			const texto10 = `Declaro, outrossim ter conhecimento pleno de que em caso de perdas parciais, quanto ao(s) equipamento(s) participante(s) do Plano de Benefício de Rateio para Ressarcimento de Despesas por Furto, Roubo e Acidentes de Veículo, e, ainda, as situações previstas no inciso II, parágrafo 4º, do artigo 6º do regimento interno, deverei, obrigatoriamente, participar com 2,5% do valor médio de mercado do(s) equipamento(s) acidentado(s), valor que será pago diretamente à ABPAC ou à oficina prestadora dos serviços de recuperação do veículo, a critério da associação.
         `
			const texto11 = `Declaro ter ciência de que o requerimento para que meu(s) equipamento(s) seja(m) cadastrado(s) no Plano de Benefício de Rateio para Ressarcimento de Despesas por Furto, Roubo e Acidentes de Veículo, deverá(ão), obrigatoriamente, ser(em) submetido(s) à avaliação de suas condições, para fins de deferimento do requerimento, bem como às inspeções de rotina que vierem a ser solicitadas pela ABPAC, a seu critério, sendo meu dever disponibilizá-lo para tais fins, nos termos do Regimento Interno, artigo 6º, parágrafo 9º, com seus incisos e alíneas, bem como artigo 17º do mesmo dispositivo legal.
         `
			const texto12 = `Declaro ainda ser conhecedor de que em caso de meu(s) equipamento(s) cadastrado(s) no Plano de Benefício de Rateio para Ressarcimento de Despesas por Furto, Roubo e Acidentes de Veículo, estiver em nome de terceira pessoa, ou seja, com titularidade diferente da minha, o associado, para fins de recebimento de qualquer tipo de indenização que possa ter direito, dependo da autorização expressa da pessoa em nome de quem se encontra registrado(s) o(s) equipamento(s) ou ainda que o referido pagamento será efetuado diretamente à pessoa em nome de que estiver registrado(s) o(s) equipamento(s).
         `
			const texto13 = `Declaro por fim que todas as informações constantes deste documento são verídicas e sobre as quais assumo total responsabilidade, admitindo serem possíveis de verificação a qualquer tempo e que, caso se identifique fraudes nas informações por mim prestadas, estarei sujeito às penas e sanções legais cíveis e penais cabíveis sem prejuízo da minha imediata exclusão de associado dos quadros da ABPAC.
         `

			content.push({
				margin: [0, 20, 0, 0],
				stack: [
					[
						{
							text: texto1,
							bold: false,
							fontSize: 6,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto2,
							bold: false,
							fontSize: 6,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto3,
							bold: false,
							fontSize: 6,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto4,
							bold: false,
							fontSize: 6,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto5,
							bold: false,
							fontSize: 6,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto6,
							bold: false,
							fontSize: 6,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto7,
							bold: false,
							fontSize: 6,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto8,
							bold: false,
							fontSize: 6,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto9,
							bold: false,
							fontSize: 6,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto10,
							bold: false,
							fontSize: 6,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto11,
							bold: false,
							fontSize: 6,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto12,
							bold: false,
							fontSize: 6,
							font: 'Roboto',
							alignment: 'justify',
						},
						{
							text: texto13,
							bold: false,
							fontSize: 6,
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

			const query = await ModelEquipamento.query()
				.where('preCadastro_id', preCadastro_id)
				.with('equipamentoStatuses')
				/*.with('boletos', build => {

         })*/
				.with('pessoa')
				.with('categoria')
				.with('equipamentoProtecoes')
				.with('equipamentoSigns.signs')
				.with('equipamentoBeneficios.beneficio')
				.with('equipamentoRestricaos')
				.fetch()

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

			const query = await ModelEquipamento.query()
				.where('preCadastro_id', modelEquipamentoSign.preCadastro_id)
				.with('equipamentoStatuses')
				.with('pessoa')
				.with('categoria')
				.with('equipamentoProtecoes')
				.with('equipamentoSigns.signs')
				.with('equipamentoBeneficios.beneficio')
				.with('equipamentoRestricaos')
				.fetch()

			return query.rows[0]
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

module.exports = AdesaoController
