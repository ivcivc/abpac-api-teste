'use strict'

const { localeData } = require('moment')

const ModelEquipamento = use('App/Models/Equipamento')
const ModelPessoa = use('App/Models/Pessoa')

const Mail = use('Mail')
const Env = use('Env')
const Helpers = use('Helpers')
const lodash = require('lodash')

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
         console.log('recebi ', lista)
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

            await Mail.send('emails.ampliar_protecao', payload, message => {
               message
                  .to(email)
                  .from(Env.get('MAIL_EMPRESA'))
                  .subject(assunto)

                  .embed(
                     Helpers.publicPath('images/ampliacao-protecao.jpeg'),
                     'logo'
                  )
            })

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
}

module.exports = AmpliacaoProtecaoController
