'use strict'
const Database = use('Database')

const Redis = use('Redis')
const Drive = use('Drive')

const RateioServices = use('App/Services/Rateio')

const kue = use('Kue')
const Job = use('App/Jobs/ACBr')

const Helpers = use('Helpers')

class RateioController {
   async callback({ request, response }) {
      console.log('callback acionado......')
      let x = request
      console.log(request.all())
      return request.all()
   }

   async auth({ request, response }) {
      var ClientOAuth2 = require('client-oauth2')

      let url = 'http://127.0.0.1:3333/api/rateio/callback'

      var githubAuth = new ClientOAuth2({
         clientId: 'm1ZnOFQ8qqljn0_e4DL3_sl5mfwa',
         clientSecret: 'vDoz7y2U2kwxkIi3wt2rdcgooE8a',
         accessTokenUri: '',
         authorizationUri:
            'https://sandbox.sicoob.com.br/oauth2/authorize?response_type=code&redirect_uri=null&client_id=m1ZnOFQ8qqljn0_e4DL3_sl5mfwa',
         redirectUri: url,
         scopes: ['notifications', 'default'],
      })

      // https://sandbox.sicoob.com.br/conta-corrente/extrato/12/2020?numeroContaCorrente=700033690

      //+ request.originalUrl()
      /*githubAuth.code.getToken(url).then(function (user) {
         console.log(user) //=> { accessToken: '...', tokenType: 'bearer', ... }

         // Refresh the current users access token.
         user.refresh().then(function (updatedUser) {
            console.log(updatedUser !== user) //=> true
            console.log(updatedUser.accessToken)
         })

         // Sign API requests on behalf of the current user.
         user.sign({
            method: 'get',
            url: 'http://example.com',
         })

         // We should store the token into a database.
         return res.send(user.accessToken)
      })*/

      githubAuth.credentials
         .getToken()
         .then(function (user) {
            console.log('credencial')
            console.log(user) //=> { accessToken: '...', tokenType: 'bearer', ... }
         })
         .catch(e => {
            console.log('falha credentials')
         })

      githubAuth.jwt
         .getToken(
            'bTFabk9GUThxcWxqbjBfZTRETDNfc2w1bWZ3YTp2RG96N3kyVTJrd3hrSWkzd3QycmRjZ29vRThh'
         )
         .then(t => {
            console.log('JWT - ', t)
         })
         .catch(e => {
            let err = e
            console.log('falhou')
         })

      let x = githubAuth
      return
   }

   async equipamentosAtivos({ params, response }) {
      //const payload = request.all()
      const dAdesao = params.dAdesao

      try {
         const retorno = await new RateioServices().equipamentosAtivos(dAdesao)
         response.status(200).send({ type: true, data: retorno })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async equipamentosDeBaixas({ params, response }) {
      //const payload = request.all()

      try {
         const retorno = await new RateioServices().equipamentosDeBaixas()
         response.status(200).send({ type: true, data: retorno })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async creditoBaixados({ params, response }) {
      //const payload = request.all()

      try {
         const retorno = await new RateioServices().creditoBaixados()
         response.status(200).send({ type: true, data: retorno })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async lista_os({ request, response }) {
      //const payload = request.all()

      try {
         const retorno = await new RateioServices().lista_os()
         response.status(200).send({ type: true, data: retorno })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async inadimplentes({ request, response }) {
      //const payload = request.all()

      try {
         const retorno = await new RateioServices().inadimplentes()
         response.status(200).send({ type: true, data: retorno })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async index({ request, response }) {
      try {
         const model = await new RateioServices().index()

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async config({ request, response }) {
      try {
         const model = await new RateioServices().config()

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async addOrUpdateConfig({ request, response }) {
      try {
         const payload = request.all()

         const model = await new RateioServices().addOrUpdateConfig(payload)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async show({ params, request, response }) {
      const id = params.id

      try {
         const model = await new RateioServices().get(id)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async store({ request, response, auth }) {
      const payload = request.all()
      //return payload
      let trx = null

      if ((await Redis.get('_isGravarRateio')) === 'sim') {
         response
            .status(400)
            .send({ success: false, message: 'Servidor ocupado.' })
         return
      }

      try {
         trx = await Database.beginTransaction()

         const model = await new RateioServices().add(payload, trx, auth)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         await trx.rollback()
         response.status(400).send(error)
      }
   }

   async simulador({ request, response, auth }) {
      const payload = request.all()

      let trx = null

      try {
         trx = await Database.beginTransaction()

         const model = await new RateioServices().simulador(payload, trx, auth)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         await trx.rollback()
         response.status(400).send(error)
      }
   }

   async update({ params, request, response }) {
      const payload = request.all()
      const ID = params.id

      try {
         /*if (await Redis.get('_isGravarRateio')) {
            throw { success: false, message: 'Servidor ocupado.' }
         }*/

         const rateio = await new RateioServices().update(ID, payload)

         response.status(200).send({ type: true, data: rateio })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async destroy({ params, request, response }) {}

   async gerarFinanceiroLoc({ params, response, auth }) {
      const id = params.id

      try {
         const model = await new RateioServices().gerarFinanceiroLoc(id, auth)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async gerarFinanceiro({ request, response, auth }) {
      const payload = request.all()

      let trx= null
      try {
         const _gerarFinanceiro = await Redis.get('_gerarFinanceiro')
         if (!_gerarFinanceiro) {
            await Redis.set('_gerarFinanceiro', 'financeiro') // gerar financeiro
         } else {
            if (_gerarFinanceiro === 'livre') {
               await Redis.set('_gerarFinanceiro', 'financeiro') // gerar financeiro
            } else {
               console.log(
                  'Ocorreu uma falha no metodo gerarFinanceiro em RateioController.'
               )
               throw {
                  success: false,
                  message:
                     'Existe um processamento pendente no servidor. Aguarde a finalização.',
               }
            }
         }

         trx = await Database.beginTransaction()

         //let aut = auth.user.toJSON()
         //let oAuth = { user: aut }

         const modelRateio = await new RateioServices().gerarFinanceiro(payload, trx, auth)


         await trx.commit()

         response.status(200).send({ type: true, data: modelRateio })
      } catch (error) {
         if ( trx) {
            await trx.rollback()
         }
         // 
         await Redis.set('_gerarFinanceiro', 'livre')

         response.status(400).send(error)
      }
   }

   async localizarEmailMassa({ params, response, auth }) {
      const rateio_id = params.id

      try {
         const model = await new RateioServices().localizarEmailMassa(
            rateio_id,
            auth
         )

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async dispararEmailMassa({ request, response, auth }) {
      const payload = request.all()

      try {
         const _gerarFinanceiro = await Redis.get('_gerarFinanceiro')

         if (!_gerarFinanceiro) {
            await Redis.set('_gerarFinanceiro', 'email-massa') // gerar financeiro
         } else {
            if (_gerarFinanceiro === 'livre') {
               await Redis.set('_gerarFinanceiro', 'email-massa') // gerar financeiro
            } else {
               throw {
                  success: false,
                  message:
                     'Existe um processamento pendente no servidor. Aguarde a finalização.',
               }
            }
         }

         response.status(200).send({
            type: true,
            message:
               'Disparo de email realizado com sucesso. Aguarde o processamento do servidor.',
         })

         const model = await new RateioServices().dispararEmailMassa(
            payload,
            auth
         )

         topic = Ws.getChannel('email_massa').topic('email_massa')
         let a = topic

         /*setTimeout(async () => {
            const model = await new RateioServices().dispararEmailMassa(
               payload,
               auth
            )
         }, 30)*/

         return

         //response.status(200).send({ type: true  })
      } catch (error) {
         console.log('nivel 2-a')
         response.status(400).send(error)
      }
   }

   async statusEmailMassa({ request, response, params }) {
      const boleto_id = params.boleto_id

      try {
         const model = await new RateioServices().statusEmailMassa(boleto_id)

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         response.status(400).send(error)
      }
   }

   async PDF_TodosEquipamentosRateioPorPessoa({ request, response }) {
      const payload = request.all()
      const pessoa_id = payload.pessoa_id
      const rateio_id = payload.rateio_id
      const retornarPDF = payload.retornarPDF
      const preview = payload.preview

      try {
         const service = await new RateioServices().PDF_TodosEquipamentosRateioPorPessoa(
            pessoa_id,
            rateio_id,
            retornarPDF
         )
         if (preview) {
            return response.status(200).send(service.pasta + service.arquivo)
         }
         if (retornarPDF) {
            if (service.pdfDoc) {
               let existe = await Drive.exists(service.pasta + service.arquivo)
               return response.attachment(service.pasta + service.arquivo)
            }
            const pathArquivo = service.pasta + service.arquivo //await Drive.get(service.arquivo)
            return response.attachment(pathArquivo)
         }

         return response.status(200).send(service.pasta + service.arquivo)
      } catch (error) {
         response.status(400).send({ success: false, message: error.message })
      }
   }

   async PDF_RateioRelatorioOcorrencias({ request, response }) {
      const payload = request.all()
      const rateio_id = payload.rateio_id
      const retornarPDF = payload.retornarPDF
      const preview = payload.preview

      try {
         const service = await new RateioServices().PDF_RateioRelatorioOcorrencias(
            rateio_id,
            retornarPDF
         )

         if (preview) {
            return response.status(200).send(service.pasta + service.arquivo)
         }
         //response.status(200).send(service.pasta + service.arquivo)
         if (retornarPDF) {
            if (service.pdfDoc) {
               let existe = await Drive.exists(service.pasta + service.arquivo)

               return response
                  .header('Content-type', 'application/pdf')
                  .download(service.pasta + service.arquivo)
            }
            const pathArquivo = service.pasta + service.arquivo //await Drive.get(service.arquivo)
            return response
               .header('Content-type', 'application/pdf')
               .download(pathArquivo)
         }

         return response.status(200).send(service.pasta + service.arquivo)
      } catch (error) {
         response.status(400).send({ success: false, message: error.message })
      }
   }

   async ocorrenciaPreviewPDF({ request, response, params }) {
      // Rateio - Relatorio de ocorrencias - envia cliente o pdf
      return new Promise(async (resolve, reject) => {
         try {
            const rateio_id = params.id
            const pasta = Helpers.tmpPath('rateio/ocorrencias/')
            const arquivo = `rateio_ocorrencias_${rateio_id}.pdf`

            const isExist = await Drive.exists(pasta + arquivo)

            if (isExist) {
               return response
                  .header('Content-type', 'application/pdf')
                  .download(pasta + arquivo)
            }
            throw { message: 'Arquivo não encontrado' }
         } catch (e) {
            reject(e)
         }
      })
   }

   async equipamentoPreviewPDF({ request, response, params }) {
      // Rateio - relatorio de equipamentos - envia para o cliente o pdf
      return new Promise(async (resolve, reject) => {
         try {
            const rateio_id = params.id
            const pasta = Helpers.tmpPath('rateio/equipamentos/')
            const arquivo = `equip_${rateio_id}.pdf`

            const isExist = await Drive.exists(pasta + arquivo)

            if (isExist) {
               return response
                  .header('Content-type', 'application/pdf')
                  .download(pasta + arquivo)
            }
            throw { message: 'Arquivo não encontrado' }
         } catch (e) {
            reject(e)
         }
      })
   }

   async isPDFBusy({ request, response, params }) {
      let res = await Redis.get('_gerarFinanceiro')
      return res === 'pdf'
   }

   async converterRateio({ request, response, auth }) {
      const ModelRateioEquipamento = use('App/Models/RateioEquipamento')
      const ModelEquipamento = use('App/Models/Equipamento')

      let trx = null

      try {
         trx = await Database.beginTransaction()

         const model = await ModelRateioEquipamento.all()

         for (const key in model.rows) {
            let r = model.rows[key]
            const equipa = await ModelEquipamento.find(r.equipamento_id)
            r.equipamento_id_principal =
               equipa.idPrincipal === 0 ? equipa.id : equipa.idPrincipal
            await r.save(trx ? trx : null)
         }

         response.status(200).send({ type: true, data: model })

         await trx.commit()
      } catch (error) {
         await trx.rollback()
         response.status(400).send(error)
      }
   }
}

module.exports = RateioController
