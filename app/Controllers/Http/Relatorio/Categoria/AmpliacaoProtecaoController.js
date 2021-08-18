'use strict'

const { localeData } = require('moment')

const ModelEquipamento = use('App/Models/Equipamento')
const ModelPessoa = use('App/Models/Pessoa')

const ServiceZap = use('App/Services/Zap/MyZap')

const Mail = use('Mail')
const Env = use('Env')
const Helpers = use('Helpers')
const lodash = require('lodash')
const Drive = use('Drive')
const fs = require('fs')

class AmpliacaoProtecaoController {
   async locEquipaPorCategoriaAno({ request, response }) {
      try {
         const payload = request.all()

         const query = await ModelEquipamento.query()
            .select(
               'id',
               'pessoa_id',
               'categoria_id',
               'especie1',
               'marca1',
               'modelo1',
               'placa1',
               'anoF1',
               'modeloF1',
               'valorMercado1',
               'status'
            )
            .with('pessoa', build => {
               build.select('id', 'nome', 'cpfCnpj', 'telSms', 'email')
            })
            .with('categoria')
            .where('status', 'Ativo')
            .where('especie1', payload.categoria)
            .where('modeloF1', '>', payload.modelo)
            //.whereBetween('modeloF1', [payload.modeloI, payload.modeloF])
            .fetch()

         response.status(200).send({ type: true, data: query })
      } catch (error) {
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async dispararEmail({ request, response }) {
      let pessoa_id = null
      try {
         const { lista } = request.all()

         const resposta = []

         for (const key in lista) {
            if (Object.hasOwnProperty.call(lista, key)) {
               const element = lista[key]
               pessoa_id = element.pessoa_id
               const pessoa = await ModelPessoa.findOrFail(element.pessoa_id)
               element.status_disparo = 'FALHOU'
               element.pessoa_id = pessoa.id
               element.email = pessoa.email
               element.assunto = 'Novidade!!!'
               if (!lodash.isEmpty(pessoa.email)) {
                  const enviar = await this.enviarEmail(element)
                  element.status_disparo = 'ENVIADO'
                  element.log = enviar
               }

               resposta.push(element)
            }
         }

         return { success: true, data: resposta }
      } catch (error) {
         let obj = {
            success: false,
            message: 'Ocorreu uma falha no disparo de email.',
            pessoa_id,
            status_disparo: 'FALHOU',
         }
         if (!error.success) {
            obj.message = error.message
            obj.pessoa_id = pessoa_id
            return response.status(401).send(obj)
         }
         response.status(400).send(error)
      }
   }

   async enviarEmail(payload) {
      return new Promise(async (resolve, reject) => {
         try {
            let assunto = payload.assunto
            let email = payload.email

            if (Env.get('NODE_ENV') === 'development') {
               email = 'ivan.a.oliveira@terra.com.br'
            }

            const resEmail = await Mail.send(
               'emails.ampliar_protecao',
               payload,
               message => {
                  message
                     .to(email)
                     .from(Env.get('MAIL_EMPRESA'))
                     .subject(assunto)

                     .embed(
                        Helpers.publicPath('images/ampliacao-protecao.jpeg'),
                        'logo'
                     )
               }
            )

            console.log('email ', resEmail)

            resolve({ success: true, message: 'Registered successfully' })
         } catch (error) {
            let message = 'Ocorreu uma falha no envio de email'
            if (lodash.has(error, 'message')) {
               message = error.message
            }

            reject({ success: false, message })
         }
      })
   }

   async dispararZap({ request, response }) {
      const payload = request.all()
      try {
         const pessoa = await ModelPessoa.findOrFail(payload.pessoa_id)

         if (!pessoa.telSms) {
            throw {
               success: false,
               message:
                  'Telefone não localizado para o associado ' + pessoa.nome,
            }
         }
         payload.tel = '55' + pessoa.telSms
         payload.nome = pessoa.nome
         const res = await this.enviarZap(payload)
         return res
      } catch (e) {
         response.status(401).send(e)
      }
   }

   async enviarZap(payload) {
      return new Promise(async (resolve, reject) => {
         try {
            let assunto = `*Novidade!!!*` //payload.assunto
            let tel = '55' + payload.tel

            let file = Helpers.publicPath('images/ampliacao-protecao.jpeg')

            if (Env.get('NODE_ENV') === 'development') {
               tel = '55' + '31987034132'
            }

            const isExist = await Drive.exists(file)

            if (isExist) {
               fs.readFile(file, { encoding: 'base64' }, async (err, data) => {
                  if (err) {
                     throw {
                        success: false,
                        message: 'Não foi possível abrir a imagem',
                     }
                  }

                  let res = await ServiceZap().sendFile(
                     tel,
                     assunto,
                     'protecao.jpeg',
                     data
                  )

                  let oLog = {
                     response:
                        res.result === 'success'
                           ? 'Arquivo enviado com sucesso!'
                           : `Status: ${res.result}`,
                     status: res.result === 'success' ? 'Enviado' : 'falha',
                  }
                  let msg =
                     res.result === 'success'
                        ? 'Arquivo enviado com sucesso!'
                        : 'Resposta do servidor whatsApp: ' + res.result
                  return resolve({
                     success: res.result === 'success',
                     message: msg,
                     log: oLog,
                  })
               })
            } else {
               console.log('Arquivo de imagem não localizado ', arquivo)
               resolve({
                  success: false,
                  arquivo: null,
                  message: 'Arquivo não localizado',
               })
            }

            /*console.log('zap retornou ', zap)

            resolve({
               success: true,
               message: 'Registered successfully',
               data: res,
            })*/
         } catch (error) {
            let message = 'Ocorreu uma falha no envio do ZAP'
            if (lodash.has(error, 'message')) {
               message = error.message
            }

            resolve({ success: false, message })
         }
      })
   }
}

module.exports = AmpliacaoProtecaoController
