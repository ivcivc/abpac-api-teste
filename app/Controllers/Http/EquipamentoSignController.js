'use strict'

const Helpers = use('Helpers')
const moment = require('moment')
moment.locale('pt-br')
const PdfPrinter = require('pdfmake/src/printer')
const fs = require('fs')
const Mail = use('Mail')
const Env = use('Env')
const BrM = require('br-masks')
const lodash = use('lodash')
const crypto = require('crypto')
const ModelSign = use('App/Models/Sign')
const ModelEquipamentoSign = use('App/Models/EquipamentoSign')
const ModelSignLog = use('App/Models/SignLog')
const ModelEquipamento = use('App/Models/Equipamento')

class EquipamentoSignController {
   moeda(n) {
      let c = new Intl.NumberFormat('de-DE').format(n)
      if (!c.includes(',')) {
         c = c + ',00'
      }
      return c
   }

   async contratoAdesao({ request, response, auth }) {
      const data = request.all()
      let equipamento_id = data.equipamento_id
      const assinar = data.assinar ? data.assinar : false

      const pasta = Helpers.tmpPath('pre_cadastro/adesao/')
      let hash = ''
      const user_id = assinar ? null : auth.user.id
      let sign_id = data.sign_id
      let arquivo = null
      let signatarioNome = null
      let arquivoOriginal = null
      let digito = null
      let assinatura = data.assinatura
      let dataDoc = data.dataDoc
      let requerimento = null
      let preCadastro_id = data.preCadastro_id
      let modelSign = null
      const sign_id_encrypt = data.id
      const token = data.token
      const ip = request.ip()

      try {
         let docID = await crypto.randomBytes(20).toString('hex')

         let equipa = null
         let modelEquipamento = null

         if (!assinar) {
            arquivo = new Date().getTime() + '.pdf'

            modelEquipamento = await ModelEquipamento.findOrFail(equipamento_id)
            await modelEquipamento.load('equipamentoStatuses')
            await modelEquipamento.load('pessoa')
            await modelEquipamento.load('categoria')
            await modelEquipamento.load('equipamentoProtecoes')
            await modelEquipamento.load('equipamentoSigns.signs')
            await modelEquipamento.load('equipamentoBeneficios.beneficio')
            await modelEquipamento.load('equipamentoRestricaos')

            equipa = modelEquipamento.toJSON()

            modelSign = await ModelSign.create({
               doc_id: docID,
               signatarioNome: data.signatarioNome,
               signatarioDNasc: data.signatarioDNasc,
               signatarioCpf: data.signatarioCpf,
               signatarioEmail: data.signatarioEmail,
               validate: moment().add(5, 'day').format(),
               tipo: 'Requerimento de Adesão',
               token: null,
               dataDoc: dataDoc,
               assinatura: assinatura,
               status: 'Pendente',
               user_id,
               arquivo,
            })

            const modelEquipamentoSign = await ModelEquipamentoSign.create({
               equipamento_id: equipa.id,
               sign_id: modelSign.id,
               preCadastro_id,
            })
            sign_id = modelSign.id
         }

         if (assinar) {
            let oDecrypt = this.decrypt(`${sign_id_encrypt}`) // Encryption.decrypt(sign_id)
            sign_id = oDecrypt.id
            digito = oDecrypt.cpf

            const modelSign = await ModelSign.findOrFail(sign_id)

            if (modelSign.status !== 'Enviado para assinatura') {
               throw {
                  mensagem: 'Documento não disponível para assinatura.',
               }
            }
            if (modelSign.token !== token) {
               throw {
                  mensagem: 'Token inválido.',
               }
            }
            modelSign.merge({
               status: 'Documento assinado',
            })

            sign_id = modelSign.id
            arquivo = 'a_' + modelSign.arquivo
            arquivoOriginal = modelSign.arquivo
            docID = modelSign.doc_id
            dataDoc = modelSign.dataDoc
            assinatura = modelSign.assinatura
            signatarioNome = modelSign.signatarioNome

            const modelEquipamentoSign = await ModelEquipamentoSign.findBy(
               'sign_id',
               modelSign.id
            )
            equipamento_id = modelEquipamentoSign.equipamento_id
            preCadastro_id = modelEquipamentoSign.preCadastro_id

            modelEquipamento = await ModelEquipamento.findOrFail(equipamento_id)
            await modelEquipamento.load('equipamentoStatuses')
            await modelEquipamento.load('pessoa')
            await modelEquipamento.load('categoria')
            await modelEquipamento.load('equipamentoProtecoes')
            await modelEquipamento.load('equipamentoSigns.signs')
            await modelEquipamento.load('equipamentoBeneficios.beneficio')
            await modelEquipamento.load('equipamentoRestricaos')

            equipa = modelEquipamento.toJSON()

            const fileBuffer = fs.readFileSync(pasta + modelSign.arquivo)
            const oHash = crypto.createHash('sha256')
            hash = oHash.update(fileBuffer).digest('hex')
            modelSign.hash = hash
            modelSign.save()
            //modelEquipamentoSign.save()

            await ModelSignLog.create({
               sign_id: modelSign.id,
               tipoEnvio: '',
               ip,
               isLog: true,
               hostname: null,
               descricao: `Assinado por ${modelSign.signatarioNome} (${modelSign.signatarioEmail}) IP: ${ip}`,
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
                        text: 'MATRICULA',
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
                        text: matricula,
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
            b1: null,
            b2: null,
            b3: null,
            b4: null,
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
                  text: 'Betim, ' + moment(dataDoc, 'YYYY-MM-DD').format('LL'),
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
                     `/images/assinaturas/${assinatura}`
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

         if (assinar) {
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
                           text: `Arquivo: ${arquivoOriginal}`,
                        },
                     ],
                     [
                        {
                           margin: [0, 0, 0, 0],
                           border: [false, false, false, false],
                           text: 'Documento nr. ' + docID,
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
                  text: signatarioNome,
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
               .where('sign_id', sign_id)
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

            // Hash
            content.push([
               {
                  margin: [0, 25, 0, 0],
                  bold: true,
                  fontSize: 10,
                  text: `Hash do documento original ` + hash,
               },
            ])
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
                  { text: 'DOC ID:' + docID, alignment: 'right' },
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

         response.status(200).send(query.rows)
      } catch (e) {
         let mensagem = 'Ocorreu uma falha de transação'
         if (lodash.has(e, 'message')) {
            mensagem = e.message
         }
         if (lodash.has(e, 'mensagem')) {
            mensagem = e.mensagem
         }

         response.status(400).send({ message: mensagem })
      }
   }

   async pdf({ request, response }) {
      const data = request.all()
      const controle = data.controle // sign_id= sem encrypt  id= encrypt
      const doc = data.doc // "arquivo-original" / "arquivo-assinado"
      let sign_id = data.id
      let isLink = data.isLink //? data.isLink : true
      if (isLink === undefined) isLink = true

      const pasta = Helpers.tmpPath('pre_cadastro/adesao/')
      let arquivoOriginal = null
      let arquivoAssinado = null
      let arquivo = null
      let digito = null

      try {
         if (controle === 'id') {
            let oDecrypt = this.decrypt(`${sign_id}`) // Encryption.decrypt(sign_id)
            sign_id = oDecrypt.id
            digito = oDecrypt.cpf
         }

         const modelSign = await ModelSign.find(sign_id)

         sign_id = modelSign.id
         if (!modelSign.arquivo) {
            throw {
               message: 'Ainda não foi gerado um documento para assinatura.',
            }
         } else {
            arquivoOriginal = modelSign.arquivo
         }
         if (modelSign.status === 'Documento assinado') {
            arquivoAssinado = 'a_' + modelSign.arquivo
         }
         if (doc === 'arquivo-assinado' && !arquivoAssinado) {
            throw { message: 'Este documento ainda não foi assinado' }
         } else {
            arquivo = arquivoAssinado
         }
         if (doc === 'arquivo-original') {
            arquivo = arquivoOriginal
         }

         if (isLink) {
            /*fs.readFile(
               pasta + arquivo,
               { encoding: 'base64' },
               async (err, data) => {
                  if (err) {
                     throw err
                  }

                  response.status(200).send(data)
               }
            )*/
            const dt = fs.readFileSync(pasta + arquivo, {
               encoding: 'base64',
               flag: 'r',
            })
            response.status(200).send(dt)
            //response.status(200).send({ success: true, arquivo:  })
         } else {
            response
               .header('Content-type', 'application/pdf')
               .download(pasta + arquivo)
         }
      } catch (e) {
         let mensagem = 'Ocorreu uma falha de transação'
         if (lodash.has(e, 'message')) {
            mensagem = e.message
         }
         if (lodash.has(e, 'mensagem')) {
            mensagem = e.mensagem
         }

         response.status(400).send({ message: mensagem })
      }
   }

   encrypt(o) {
      const cpf = o.signatarioCpf.substring(0, 4)

      return `${cpf}${o.id}`
   }

   decrypt(hash) {
      if (!hash) return { id: null, cpf: '' }
      if (hash.lenght < 5) return { id: null, cpf: '' }
      return { id: hash.substr(4), cpf: hash.substring(0, 4) }
   }

   async tokenSign({ params, response }) {
      const sign_id_encrypt = params.sign_id
      let sign_id = null
      let modelSign = null
      let token = null
      let emailError = false
      let mail = null
      let digito = null

      try {
         let oDecrypt = this.decrypt(`${sign_id_encrypt}`) // Encryption.decrypt(sign_id)
         sign_id = oDecrypt.id
         digito = oDecrypt.cpf

         modelSign = await ModelSign.find(sign_id)

         if (modelSign.status !== 'Enviado para assinatura') {
            throw {
               mensagem: 'Não foi possível gerar o token.',
            }
         }
         token = await crypto.randomBytes(2).toString('hex')

         modelSign.merge({
            token,
         })

         /*const modelEquipamentoSign = await ModelEquipamentoSign.findBy(
            'sign_id',
            modelSign.id
         )*/

         await modelSign.save()

         //const URL_SERVIDOR_WEB = Env.get('URL_SERVIDOR_SIGN')
         const signJSON = modelSign.toJSON()

         const assunto = 'Token: Token de verificação de assinatura'

         emailError = true

         mail = await Mail.send(
            'emails.sign_token_assinatura',
            signJSON,
            message => {
               message
                  .to(modelSign.signatarioEmail)
                  .from('investimentos@abpac.com.br')
                  .subject(assunto)
               //.attach(Helpers.tmpPath('ACBr/pdf/boleto_50173.pdf'))
               //.embed(Helpers.publicPath('images/logo-abpac.png'), 'logo')
            }
         )

         emailError = false

         await ModelSignLog.create({
            sign_id: signJSON.id,
            tipoEnvio: 'email',
            isLog: true,
            hostname: signJSON.link,
            descricao: `Token de verificação enviado para ${signJSON.signatarioNome} (${signJSON.signatarioEmail})`,
         })

         response.status(200).send({ message: 'Token enviado com sucesso!' })
      } catch (e) {
         let mensagem = 'Ocorreu uma falha de transação'
         if (lodash.has(e, 'message')) {
            mensagem = e.message
         }
         if (lodash.has(e, 'mensagem')) {
            mensagem = e.mensagem
         }

         response.status(400).send({ message: mensagem })
      }
   }

   async cancelSign({ request, response, auth }) {
      const data = request.all()
      let emailError = true
      let modelSign = null

      try {
         modelSign = await ModelSign.find(data.id)
         if (modelSign.status === 'Documento assinado') {
            throw {
               mensagem: 'Não é permitido cancelar um documento assinado.',
            }
         }
         const modelEquipamentoSign = await ModelEquipamentoSign.findBy(
            'sign_id',
            modelSign.id
         )

         modelSign.merge({
            status: 'Cancelado',
         })
         await modelSign.save()

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

         response.status(200).send(query.rows)
      } catch (e) {
         let mensagem = 'Ocorreu uma falha de transação'
         if (lodash.has(e, 'message')) {
            mensagem = e.message
         }
         if (lodash.has(e, 'mensagem')) {
            mensagem = e.message
         }

         response.status(400).send({ message: mensagem })
      }
   }

   async updateSign({ request, response, auth }) {
      const data = request.all()
      let emailError = true
      let modelSign = null

      try {
         modelSign = await ModelSign.find(data.id)
         if (modelSign.status !== 'Pendente' && modelSign.status !== 'Manual') {
            throw { mensagem: 'Não é permitido alterar esse documento.' }
         }
         const modelEquipamentoSign = await ModelEquipamentoSign.findBy(
            'sign_id',
            modelSign.id
         )

         modelSign.merge({
            signatarioCpf: data.signatarioCpf,
            signatarioDNasc: data.signatarioDNasc,
            signatarioEmail: data.signatarioEmail,
            signatarioNome: data.signatarioNome,
            assinatura: data.assinatura,
            dataDoc: data.dataDoc,
            status: data.status,
            validate: moment(data.validate).add(5, 'day').format(),
         })
         await modelSign.save()

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

         response.status(200).send(query.rows)
      } catch (e) {
         let mensagem = 'Ocorreu uma falha de transação'
         if (lodash.has(e, 'message')) {
            mensagem = e.message
         }
         if (lodash.has(e, 'mensagem')) {
            mensagem = e.mensagem
         }

         response.status(400).send({ message: mensagem })
      }
   }

   async solicitarAssinatura({ request, response, auth }) {
      const data = request.all()
      let emailError = false
      let modelSign = null
      let mail = false
      let equipamento_id = data.equipamento_id
      let erroStatus = false

      try {
         //const equipamento_id = data.equipamento_id
         //const modelPessoa= await ModelPessoa.find()
         modelSign = await ModelSign.find(data.sign_id)
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
         modelSign.merge({
            signatarioCpf: data.signatarioCpf,
            signatarioDNasc: data.signatarioDNasc,
            signatarioEmail: data.signatarioEmail,
            signatarioNome: data.signatarioNome,
            assinatura: data.assinatura,
            dataDoc: data.dataDoc,
            validate: moment(data.validate).add(5, 'day').format(),
         })
         await modelSign.save()

         const URL_SERVIDOR_WEB = Env.get('URL_SERVIDOR_SIGN')
         const signJSON = modelSign.toJSON()
         const crypto_sign_id = this.encrypt(signJSON) //Encryption.encrypt(signJSON.id)
         signJSON.link = `${URL_SERVIDOR_WEB}/equipa/${crypto_sign_id}`

         const assunto = 'Assinar documento: Requerimento de Adesão'

         emailError = true

         mail = await Mail.send(
            'emails.sign_requerimento_adesao',
            signJSON,
            message => {
               message
                  .to(modelSign.signatarioEmail)
                  .from('investimentos@abpac.com.br')
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

         modelSign.merge({ status: 'Enviado para assinatura' })
         await modelSign.save()

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

         response.status(200).send(query.rows)
      } catch (e) {
         let mensagem = 'Ocorreu uma falha de transação'
         if (lodash.has(e, 'mensagem')) {
            mensagem = e.mensagem
         }
         if (lodash.has(e, 'message')) {
            mensagem = e.message
         }
         if (emailError) {
            const signJSON = modelSign.toJSON()
            await ModelSignLog.create({
               sign_id: signJSON.id,
               tipoEnvio: 'email',
               isLog: false,
               hostname: signJSON.link,
               descricao: `Enviado para assinatura de ${signJSON.signatarioNome} (${signJSON.signatarioEmail})`,
            })
            mensagem = 'Ocorreu uma falha no envio do email.'
         }

         response.status(400).send({ message: mensagem })
      }
   }
}

module.exports = EquipamentoSignController
