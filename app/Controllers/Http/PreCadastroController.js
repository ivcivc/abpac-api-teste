'use strict'
const PdfPrinter = require('pdfmake/src/printer')
const Helpers = use('Helpers')
const moment = require('moment')
moment.locale('pt-br')
const fs = require('fs')
const ModelPessoa = use('App/Models/Pessoa')
const ModelPessoaSign = use('App/Models/PessoaSign')
const ModelSign = use('App/Models/Sign')
const ModelSignLog = use('App/Models/SignLog')
const BrM = require('br-masks')
const crypto = require('crypto')
const uuid = require('uuid')
const Mail = use('Mail')
const Env = use('Env')
const lodash = use('lodash')

class PreCadastroController {
   async solicitarAssinatura({ request, response, auth }) {
      const data = request.all()
      let emailError = true
      let modelSign = null
      let mail = false
      let pessoa_id = data.pessoa_id

      try {
         //const pessoa_id = data.pessoa_id
         //const modelPessoa= await ModelPessoa.find()
         modelSign = await ModelSign.find(data.sign_id)
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
         signJSON.link = `${URL_SERVIDOR_WEB}/${signJSON.id}`

         const assunto = 'Assinar documento: Ficha de Inscrição'

         emailError = true

         mail = await Mail.send(
            'emails.sign_ficha_inscricao',
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
            tipo: '',
            isLog: true,
            hostname: signJSON.link,
            descricao: `Enviado para assinatura de ${signJSON.signatarioNome} (${signJSON.signatarioEmail})`,
         })

         modelSign.merge({ status: 'Enviado para assinatura' })
         await modelSign.save()

         const pessoa = await ModelPessoa.findOrFail(pessoa_id)

         await pessoa.load('pessoaSigns.signs')

         response.status(200).send(pessoa)
      } catch (e) {
         let mensagem = 'Ocorreu uma falha de transação'
         if (lodash.has(e, 'mensagem')) {
            mensagem = e.message
         }
         if (emailError) {
            const signJSON = modelSign.toJSON()
            await ModelSignLog.create({
               sign_id: signJSON.id,
               tipoEnvio: 'email',
               tipo: '',
               isLog: false,
               hostname: signJSON.link,
               descricao: `Enviado para assinatura de ${signJSON.signatarioNome} (${signJSON.signatarioEmail})`,
            })
            mensagem = 'Ocorreu uma falha no envio do email.'
         }

         response.status(400).send({ message: mensagem })
      }
   }

   async fichaInscricao({ request, response, auth }) {
      try {
         const data = request.all()
         const pessoa_id = data.pessoa_id
         const assinar = data.assinar ? data.assinar : false
         const dataDoc = data.dataDoc ? data.dataDoc : null
         const assinatura = data.assinatura ? data.assinatura : null
         const preCadastro_id = data.preCadastro_id

         let hash = ''
         const user_id = auth.user.id
         let sign_id = data.sign_id

         const pessoa = await ModelPessoa.findOrFail(pessoa_id)
         pessoa.cpfCnpj =
            pessoa.tipoPessoa === 'Física'
               ? BrM.cpf(pessoa.cpfCnpj)
               : BrM.cnpj(pessoa.cpfCnpj)
         pessoa.dNasc = pessoa.dNasc
            ? moment(pessoa.dNasc, 'YYYY-MM-DD').format('DD/MM/YYYY')
            : ''
         pessoa.responsavel = pessoa.responsavel
            ? pessoa.responsavel.toUpperCase()
            : ''
         pessoa.endRua = pessoa.endRua ? pessoa.endRua.toUpperCase() : ''
         if (pessoa.endComplemento) {
            pessoa.endRua =
               pessoa.endRua + ' ' + pessoa.endComplemento.toUpperCase()
         }
         pessoa.endBairro = pessoa.endBairro
            ? pessoa.endBairro.toUpperCase()
            : ''
         pessoa.endCidade = pessoa.endCidade
            ? pessoa.endCidade.toUpperCase()
            : ''
         pessoa.endEstado = pessoa.endEstado
            ? pessoa.endEstado.toUpperCase()
            : ''
         pessoa.endCep = pessoa.endCep ? BrM.cep(pessoa.endCep) : ''
         let matricula = `${pessoa.id}`
         matricula = matricula.padStart(10, '0')

         const docID = await crypto.randomBytes(20).toString('hex')

         const pasta = Helpers.tmpPath('pre_cadastro/inscricao/')
         let arquivo = null

         if (!assinar) {
            arquivo = new Date().getTime() + '.pdf'
            const modelSign = await ModelSign.create({
               doc_id: docID,
               signatarioNome: data.signatarioNome,
               signatarioDNasc: data.signatarioDNasc,
               signatarioCpf: data.signatarioCpf,
               signatarioEmail: data.signatarioEmail,
               validate: moment().add(5, 'day').format(),
               tipo: 'Requerimento de Inscrição',
               token: null,
               dataDoc: dataDoc,
               assinatura: assinatura,
               status: 'Pendente',
               user_id,
               arquivo,
            })

            const modelPessoaSign = await ModelPessoaSign.create({
               pessoa_id: pessoa.id,
               sign_id: modelSign.id,
               preCadastro_id,
            })
            sign_id = modelSign.id
         }

         if (assinar) {
            const modelSign = await ModelSign.findOrFail(sign_id)
            arquivo = 'a_' + modelSign.arquivo
         }

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
            tels[`tel${i + 1}`] = BrM.phone(e.tel)
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
                                 text: 'MATRÍCULA: ' + matricula,
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
                        text: 'DATA NASCIMENTO',
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

         content.push({
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
         })

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
                           text: `Arquivo: ${arquivo}`,
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
                  text: 'Ivan Carlos Araujo de Oliveira',
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

            const logs = [
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
            ]

            logs.forEach((e, i) => {
               content.push({
                  columns: [
                     {
                        width: 100,
                        text: e.createdAt,
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
         console.log('=> ', pasta + arquivo)

         pdfDoc.on('end', t => {
            console.log('terminou.', t)
            /*response
               .header('Content-type', 'application/pdf')
               .download(pasta + arquivo)*/
         })

         /* await pessoa.load('pessoaSigns', builder => {
           builder.with('signs')
         })*/
         await pessoa.load('pessoaSigns.signs')

         /*const res = await ModelPessoa.query()
            .where('id', pessoa_id)
            .with('pessoaSigns', builder => {
               builder.with('signs')
            })
            .fetch()*/

         response.status(200).send(pessoa)
      } catch (e) {
         response.status(400).send({ message: 'falhou' })
      }
   }

   async fichaInscricaoPDF({ request, response }) {
      const pasta = Helpers.tmpPath('pre_cadastro/inscricao/')
      let arquivo = `arq.pdf`
      arquivo = arquivo.trim()
      console.log('reques ', request)

      const fileBuffer = fs.readFileSync(pasta + arquivo)
      const hash = crypto.createHash('sha256')
      const finalHex = hash.update(fileBuffer).digest('hex')

      //const stat = await fs.stat(pasta + arquivo)
      console.log(finalHex)

      /*const Encryption = use('Encryption')
      const encrypted = Encryption.encrypt(100)

      console.log('encryption= ', encrypted)
      console.log('description= ', Encryption.decrypt(encrypted))*/

      console.log('=> ', pasta + arquivo)
      response
         .header('Content-type', 'application/pdf')
         .download(pasta + arquivo)
   }
}

module.exports = PreCadastroController
