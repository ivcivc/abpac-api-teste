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
const ModelPreCadastro = use('App/Models/PreCadastro')
const ModelEquipamento = use('App/Models/Equipamento')
const ModelOsConfig = use('App/Models/ordem_servico/OsConfig')
//const ModelOrdemServico= use('App/Models/ordem_servico/OrdemServico')
const OrdemServicoServices = use('App/Services/OrdemServico')
const Drive = use('Drive')

const BrM = require('br-masks')
const crypto = require('crypto')
//const uuid = require('uuid')
const Mail = use('Mail')
const Env = use('Env')
const lodash = use('lodash')
const Database = use('Database')

const URL_SERVIDOR_SIGN_EMAIL = Env.get('URL_SERVIDOR_SIGN_EMAIL')

class PreCadastroController {
   async pdf_link({ params, response }) {
      try {
         console.log('pdf link ', params.sign_id)
         const sign_id_encrypt = params.sign_id

         let oDecrypt = this.decrypt(`${sign_id_encrypt}`) // Encryption.decrypt(sign_id)
         const sign_id = oDecrypt.id
         const digito = oDecrypt.cpf

         const modelSign = await ModelSign.find(sign_id)

         if (!modelSign) {
            throw { success: false, message: 'Documento não reconhecido.' }
         }

         if (modelSign.status !== 'Enviado para assinatura') {
            let st = 'status-invalido'
            if (modelSign.status === 'Documento assinado') {
               st = 'status-assinado'
            }
            return response
               .status(200)
               .send({ success: false, link: null, status: st })
         }

         let pastaTipo = ''

         if (modelSign.tipo === 'Requerimento de Inscrição') {
            pastaTipo = `inscricao`
         }
         if (modelSign.tipo === 'Requerimento de Adesão') {
            pastaTipo = `adesao`
         }

         let file = Helpers.tmpPath(
            `pre_cadastro/${pastaTipo}/${modelSign.arquivo}`
         )
         console.log('pdf_link arquivo= ', file)
         let existe = await Drive.exists(file)

         if (!existe) {
            return response.status(200).send({
               signatarioEmail: modelSign.signatarioEmail,
               signatarioNome: modelSign.signatarioNome,
               signatarioCpf: BrM.cpf(modelSign.signatarioCpf),
               signatarioDNasc: moment(
                  modelSign.signatarioDNasc,
                  'YYYY-MM-DD'
               ).format('DD/MM/YYYY'),
               tipo: pastaTipo,
               doc: modelSign.arquivo,
               success: false,
               message: 'Documento não localizado.',
            })
         }

         //const URL_SERVIDOR_WEB = Env.get('URL_SERVIDOR_SIGN')

         return response.status(200).send({
            signatarioEmail: modelSign.signatarioEmail,
            signatarioNome: modelSign.signatarioNome,
            signatarioCpf: BrM.cpf(modelSign.signatarioCpf),
            signatarioDNasc: moment(
               modelSign.signatarioDNasc,
               'YYYY-MM-DD'
            ).format('DD/MM/YYYY'),
            tipo: pastaTipo,
            doc: modelSign.arquivo,
            success: true,
         })

         /*return response
            .header('Content-type', 'application/pdf')
            .download(file)*/
      } catch (e) {
         console.log(e)
         response
            .status(400)
            .send({ success: false, message: 'Documento não localizado ' })
      }
   }

   async pdf({ params, response }) {
      try {
         const arquivo = params.arquivo
         const tipo = params.tipo
         let pasta = ''
         if (tipo === 'inscricao') {
            pasta = Helpers.tmpPath(`pre_cadastro/inscricao/${arquivo}`)
         }
         if (tipo === 'adesao') {
            pasta = Helpers.tmpPath(`pre_cadastro/adesao/${arquivo}`)
         }
         console.log(arquivo)
         console.log('>>>>>>>>>>>>>>>>>>>> ', pasta)
         if (arquivo) {
            let existe = await Drive.exists(pasta)

            return response
               .header('Content-type', 'application/pdf')
               .download(pasta)
         }
         return response.status(501)
      } catch (e) {
         console.log('PRINCIPAL ', e)
         response
            .status(200)
            .send({ success: false, message: 'modulo principal ' + e.message })
      }
   }

   async update({ request, response, auth }) {
      const data = request.all()
      let trx = null
      console.log('persistir ', data)
      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }

         const model = await ModelPreCadastro.findOrFail(data.id)

         const o = {
            //pessoa_id: model.pessoa_id,
            valorAdesao: data.valorAdesao,
            nota: data.nota,
            dAutorizacao: !lodash.isEmpty(data.dAutorizacao)
               ? moment(data.dAutorizacao, 'YYYY-MM-DD').format('YYYY-MM-DD')
               : null,
            status: data.status,
         }
         console.log('o= ', o)

         if (data.status === 'Autorizado' && model.status !== 'Autorizado') {
            await ModelPessoa.query()
               .where('id', model.pessoa_id)
               .where('status', 'Pre-cadastro')
               .transacting(trx ? trx : null)
               .update({ status: 'Ativo', updated_at: moment() })

            await ModelEquipamento.query()
               .where('preCadastro_id', model.id)
               .where('status', 'Pre-cadastro')
               .transacting(trx ? trx : null)
               .update({ status: 'Ativo', updated_at: moment() })
         }
         if (data.status !== 'Autorizado' && model.status === 'Autorizado') {
            await ModelPessoa.query()
               .where('id', model.pessoa_id)
               .where('status', 'Ativo')
               .transacting(trx ? trx : null)
               .update({ status: 'Pre-cadastro', updated_at: moment() })

            await ModelEquipamento.query()
               .where('preCadastro_id', model.id)
               .where('status', 'Ativo')
               .transacting(trx ? trx : null)
               .update({ status: 'Pre-cadastro', updated_at: moment() })
         }

         model.merge(o)
         await model.save(trx)

         await trx.commit()

         return await this.localizarPorID({ params: { id: model.id } })
      } catch (e) {
         await trx.rollback()
         throw e
      }
   }

   async gerarOsAdesao({ request, response, auth }) {
      const data = request.all()
      let trx = null

      try {
         if (!trx) {
            trx = await Database.beginTransaction()
         }
         const modelOsConfig = await ModelOsConfig.findByOrFail(
            'modelo',
            'Adesão'
         )

         const os = {
            pessoa_id: data.pessoa_id,
            config_id: modelOsConfig.id,
            user_id: auth.user.id,
            dCompetencia: moment(data.dAdesao, 'YYYY-MM-DD').format(
               'YYYY-MM-DD'
            ),
            status: 'Em espera',
            valorSubtotal: data.valorAdesao,
            valorTotal: data.valorAdesao,
            isPagar: false,
            isReceber: true,
            isRatear: false,
            preCadastro_id: data.preCadastro_id,
            equipamento_id: data.equipamento_id,
            //planoDeConta_id: modelOsConfig.planoDeConta_id,

            items: [
               {
                  quantidade: 1,
                  descricao: 'Adesão',
                  valorBase: data.valorAdesao,
                  subtotal: data.valorAdesao,
                  total: data.valorAdesao,
               },
            ],
         }

         const modelPreCadastro = await ModelPreCadastro.findOrFail(
            data.preCadastro_id
         )
         modelPreCadastro.merge({ valorAdesao: data.valorAdesao })
         modelPreCadastro.save(trx)

         const serviceOS = await new OrdemServicoServices().add(os, trx, auth)

         await trx.commit()

         //const modelOrdemServico = await ModelOrdemServico.create()
         return serviceOS
      } catch (e) {
         await trx.rollback()
         throw e
      }
   }

   async localizarPorID({ params }) {
      const preCadastro_id = params.id
      try {
         const modelPreCadastro = await ModelPreCadastro.findOrFail(
            preCadastro_id
         )
         const modelPessoaSign = await ModelPessoaSign.findBy(
            'preCadastro_id',
            preCadastro_id
         )
         const modelPessoa = await ModelPessoa.findOrFail(
            modelPreCadastro.pessoa_id
         )
         await modelPessoa.load('pessoaSigns.signs')
         const queryEquipamento = await ModelEquipamento.query()
            .where('preCadastro_id', preCadastro_id)
            .with('equipamentoStatuses')
            .with('pessoa')
            .with('categoria')
            .with('equipamentoProtecoes')
            .with('equipamentoSigns.signs')
            .with('equipamentoBeneficios.beneficio')
            .with('equipamentoRestricaos')
            .fetch()

         const ordemServicoServices =
            await new OrdemServicoServices().getPreCadastro(modelPreCadastro.id)

         let retorno = {
            pessoa: modelPessoa,
            preCadastro: modelPreCadastro,
            equipamentos: queryEquipamento.rows,
         }

         if (ordemServicoServices) {
            retorno.os = ordemServicoServices
         }

         return retorno
      } catch (error) {
         console.log('falhou ', error)
         return error
      }
   }

   async localizarPor({ request, response }) {
      const data = request.all()
      const por = data.por

      let busca = []

      try {
         busca = await Database.from('pre_cadastros')
            .select([
               'pre_cadastros.id as preCadastro_id',
               'pre_cadastros.status',
               'pre_cadastros.created_at',
               'pre_cadastros.dAutorizacao',
               'pre_cadastros.nota',
               'pre_cadastros.id',
               'pessoas.id as pessoa_id',
               'pessoas.nome as pessoa_nome',
            ])
            .innerJoin('pessoas', 'pre_cadastros.pessoa_id', 'pessoas.id')
            .where(por.field_name, por.field_op, por.field_value)

         return busca
      } catch (error) {
         let msg = 'Ocorreu uma falha na busca'
         if (!lodash.has(error, 'message')) {
            msg = error.message
         }
         console.log('falhou ', error)
         response.status(400).send({ message: msg, success: false })
      }
   }

   async DELETAR____toSign({ request, response }) {
      const data = request.all()
      const sign_id_encrypt = data.id
      const token = data.token
      let sign_id = null
      let digito = null

      try {
         let oDecrypt = this.decrypt(`${sign_id_encrypt}`) // Encryption.decrypt(sign_id)
         sign_id = oDecrypt.id
         digito = oDecrypt.cpf

         modelSign = await ModelSign.find(sign_id)

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
         const modelPessoaSign = await ModelPessoaSign.findBy(
            'sign_id',
            modelSign.id
         )
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
                  .from(URL_SERVIDOR_SIGN_EMAIL)
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

   async validarTokenSign({ request, response }) {
      const data = request.all()
      const sign_id_encrypt = data.sign_id
      let sign_id = null
      let token = data.token
      let success = true
      let digito = null

      try {
         let oDecrypt = this.decrypt(`${sign_id_encrypt}`) // Encryption.decrypt(sign_id)
         sign_id = oDecrypt.id
         digito = oDecrypt.cpf

         const modelSign = await ModelSign.find(sign_id)
         if (modelSign.token !== token) {
            success = false
         }
         response.status(200).send({ success })
      } catch (e) {
         response.status(400).send({
            success: false,
            message: 'Não foi possível validar o token.',
         })
      }
   }

   async reEnviarTokenSign({ params, response }) {
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

         if (!modelSign) {
            throw { message: 'Assinatura não encontrada.' }
         }

         if (modelSign.status !== 'Enviado para assinatura') {
            throw {
               mensagem: 'Não foi possível gerar o token.',
            }
         }

         if (!modelSign.token) {
            token = await crypto.randomBytes(2).toString('hex')

            modelSign.merge({
               token,
            })
            const modelPessoaSign = await ModelPessoaSign.findBy(
               'sign_id',
               modelSign.id
            )
            await modelSign.save()
         }

         const modelPessoaSign = await ModelPessoaSign.findBy(
            'sign_id',
            modelSign.id
         )
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
                  .from(URL_SERVIDOR_SIGN_EMAIL)
                  .subject(assunto)
               //.attach(Helpers.tmpPath('ACBr/pdf/boleto_50173.pdf'))
               //.embed(Helpers.publicPath('images/logo-abpac.png'), 'logo')
            }
         )

         emailError = false

         await ModelSignLog.create({
            sign_id: signJSON.id,
            tipoEnvio: 'email',
            isLog: false,
            hostname: signJSON.link,
            descricao: `Token de verificação enviado para ${signJSON.signatarioNome} (${signJSON.signatarioEmail})`,
         })

         response
            .status(200)
            .send({ success: true, message: 'Token enviado com sucesso!' })
      } catch (e) {
         let mensagem = 'Ocorreu uma falha de transação'
         if (lodash.has(e, 'message')) {
            mensagem = e.message
         }
         if (lodash.has(e, 'mensagem')) {
            mensagem = e.mensagem
         }
         if (emailError) {
            message = 'Ocorreu uma falha no envio do email.'
         }

         response.status(400).send({ success: false, message: mensagem })
      }
   }

   async enviarTokenSign({ params, response }) {
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
         const modelPessoaSign = await ModelPessoaSign.findBy(
            'sign_id',
            modelSign.id
         )
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
                  .from(URL_SERVIDOR_SIGN_EMAIL)
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

         response.status(200).send({
            success: true,
            message: 'Token enviado com sucesso! Confira o seu e-mail',
         })
      } catch (e) {
         let mensagem = 'Ocorreu uma falha de transação'
         if (lodash.has(e, 'message')) {
            mensagem = e.message
         }
         if (lodash.has(e, 'mensagem')) {
            mensagem = e.mensagem
         }
         if (emailError) {
            message = 'Ocorreu uma falha no envio do email.'
         }

         response.status(400).send({ success: false, message: mensagem })
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
         const modelPessoaSign = await ModelPessoaSign.findBy(
            'sign_id',
            modelSign.id
         )

         modelSign.merge({
            status: 'Cancelado',
         })
         await modelSign.save()

         const pessoa = await ModelPessoa.findOrFail(modelPessoaSign.pessoa_id)

         await pessoa.load('pessoaSigns.signs')

         response.status(200).send(pessoa)
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
         const modelPessoaSign = await ModelPessoaSign.findBy(
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

         const pessoa = await ModelPessoa.findOrFail(modelPessoaSign.pessoa_id)

         await pessoa.load('pessoaSigns.signs')

         response.status(200).send(pessoa)
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
      let pessoa_id = data.pessoa_id
      let erroStatus = false

      try {
         //const pessoa_id = data.pessoa_id
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
         signJSON.link = `${URL_SERVIDOR_WEB}/#!/doc?token=${crypto_sign_id}`

         const assunto = 'Assinar documento: Ficha de Inscrição'

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

         modelSign.merge({ status: 'Enviado para assinatura' })
         await modelSign.save()

         const pessoa = await ModelPessoa.findOrFail(pessoa_id)

         await pessoa.load('pessoaSigns.signs')

         response.status(200).send(pessoa)
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

   async fichaInscricao({ request, response, auth }) {
      try {
         const data = request.all()
         let pessoa_id = data.pessoa_id
         const assinar = data.assinar ? data.assinar : false
         let dataDoc = data.dataDoc ? data.dataDoc : null
         let assinatura = data.assinatura ? data.assinatura : null
         let preCadastro_id = data.preCadastro_id
         const ip = request.ip()
         let token = data.token
         const sign_id_encrypt = data.id

         let hash = ''
         const user_id = assinar ? null : auth.user.id
         let sign_id = data.sign_id

         let docID = await crypto.randomBytes(20).toString('hex')

         const pasta = Helpers.tmpPath('pre_cadastro/inscricao/')
         let arquivo = null

         let modelSign = null
         let signatarioNome = null
         let arquivoOriginal = null
         let digito = null

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

            const modelPessoaSign = await ModelPessoaSign.findBy(
               'sign_id',
               modelSign.id
            )
            pessoa_id = modelPessoaSign.pessoa_id
            preCadastro_id = modelPessoaSign.preCadastro_id

            const fileBuffer = fs.readFileSync(pasta + modelSign.arquivo)
            const oHash = crypto.createHash('sha256')
            hash = oHash.update(fileBuffer).digest('hex')
            modelSign.hash = hash
            modelSign.save()

            await ModelSignLog.create({
               sign_id: modelSign.id,
               tipoEnvio: '',
               ip,
               isLog: true,
               hostname: null,
               descricao: `Assinado por ${modelSign.signatarioNome} (${modelSign.signatarioEmail}) IP: ${ip}`,
            })
         }

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

         if (!assinar) {
            arquivo = new Date().getTime() + '.pdf'
            modelSign = await ModelSign.create({
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
         await pessoa.load('pessoaSigns.signs')

         /*const res = await ModelPessoa.query()
            .where('id', pessoa_id)
            .with('pessoaSigns', builder => {
               builder.with('signs')
            })
            .fetch()*/

         if (assinar) {
            return pessoa
         } else {
            response.status(200).send(pessoa)
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

   async fichaInscricaoPDF({ request, response }) {
      const data = request.all()
      const controle = data.controle // sign_id= sem encrypt  id= encrypt
      const doc = data.doc // "arquivo-original" / "arquivo-assinado"
      let sign_id = data.id
      let isLink = data.isLink //? data.isLink : true
      if (isLink === undefined) isLink = true

      const pasta = Helpers.tmpPath('pre_cadastro/inscricao/')
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

         console.log('arquivo= ', pasta + arquivo)

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
      hash = hash.replace(/([^\d])+/gim, '')
      if (hash.lenght < 5) return { id: null, cpf: '' }
      return { id: hash.substr(4), cpf: hash.substring(0, 4) }
   }
}

module.exports = PreCadastroController
