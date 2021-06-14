'use strict'

const fetch = require('node-fetch')
const { Headers } = require('node-fetch')
const moment = require('moment')
const ModelBankConfig = use('App/Models/Bank/BankConfig')
const Database = use('Database')
const Env = use('Env')
const lodash = use('lodash')
const ModelConta = use('App/Models/Conta')

function Auth() {
   try {
      let tokenMinutes = 58

      async function callback(res) {
         try {
            const modelConta = await ModelConta.findBy('modeloBoleto', 'sicoob')

            let conta_id = modelConta.id
            if (!modelConta.length === 0)
               throw {
                  success: false,
                  erroNr: 602,
                  message: 'Conta/Modelo Sicoob não localizada.',
               }

            let queryConfig = await Database.from('bank_configs')
               .where('conta_id', conta_id)
               .andWhere('recurso', 'boleto')
               .first()

            if (queryConfig === undefined) {
               queryConfig = {
                  conta_id: conta_id,
                  recurso: 'boleto',
                  refreshToken: null,
                  token: null,
                  Validate: null,
                  authValidate: null,
               }
            }

            const para = new URLSearchParams({
               grant_type: 'authorization_code',
               code: res.code,
               redirect_uri: Env.get('SICOOB_REDIRECT_URL'),
            })

            const meta = {
               'Content-Type': 'application/x-www-form-urlencoded',
               Authorization: `Basic ${Env.get('SICOOB_TOKEN_BASIC')}`,
            }
            const headers = new Headers(meta)

            const url = Env.get('SICOOB_URL_ACCESS_TOKEN')
            const response = await fetch(url, {
               method: 'POST',
               body: para,
               headers: headers,
            })
            const data = await response.json()

            if (lodash(data, 'error')) {
               if (data.error === 'invalid_grant') {
                  return `<html><h1>Autenticação inválida!</h1><script type="text/javascript" language="JavaScript">

                  setTimeout(() => {
                     window.close();
                  }, 5000)

               </script></html>`
               }
            }

            console.log(data)

            let hoje = moment()
            let dVencToken = hoje
               .add(tokenMinutes, 'minute')
               .format('YYYY-MM-DD HH:mm:ss')
            let dVencRefreshToken = hoje
               .add(1, 'month')
               .format('YYYY-MM-DD HH:mm:ss')

            queryConfig.authValidate = dVencRefreshToken
            queryConfig.Validate = dVencToken
            queryConfig.token = data.access_token
            queryConfig.refreshToken = data.refresh_token

            if (lodash.has(queryConfig, 'id')) {
               const modelConfig = await ModelBankConfig.find(queryConfig.id)
               modelConfig.merge(queryConfig)
               await modelConfig.save()
            } else {
               await ModelBankConfig.create(queryConfig)
            }

            return `<html><h1>Autenticado com sucesso!</h1><script type="text/javascript" language="JavaScript">

                  setTimeout(() => {
                     window.close();
                  }, 500)

               </script></html>`
         } catch (error) {
            return error
         }
      }

      /*function getMinutesBetweenDates(startDate, endDate) {
         var diff = endDate.getTime() - startDate.getTime()
         return diff / 60000 
      }*/

      async function refreshToken(model) {
         return new Promise(async (resolve, reject) => {
            console.log('refreshToken.')
            const tokenVenc = moment(model.Validate).format() //.format('YYYY-MM-DD HH:MM:SS')
            const agora = moment().format() //.format('YYYY-MM-DD HH:MM:SS')

            // solicitar refresh
            const para = new URLSearchParams({
               grant_type: 'refresh_token',
               refresh_token: model.refreshToken,
            })

            const meta = {
               'Content-Type': 'application/x-www-form-urlencoded',
               Authorization: `Basic ${Env.get('SICOOB_TOKEN_BASIC')}`,
            }
            const headers = new Headers(meta)

            const response = await fetch(Env.get('SICOOB_URL_REFRESH_TOKEN'), {
               method: 'POST',
               body: para,
               headers: headers,
            })
            const data = await response.json()
            console.log('callback ', data)
            if (lodash.has(data, 'error')) {
               try {
                  throw {
                     success: false,
                     erroNr: 601,
                     message: data.error_description,
                     error: data.error,
                  }
               } catch (e) {
                  return reject(e)
               }
            }

            let hoje = moment()
            let dVencRefreshToken = hoje
               .add(tokenMinutes, 'minute')
               .format('YYYY-MM-DD HH:mm:ss')

            //let di= d.add(1, 'day').format('YYYY-MM-DD HH:mm:ss')
            const modelAuthorization = await ModelBankConfig.findOrFail(
               model.id
            )
            modelAuthorization.merge({
               token: data.access_token,
               refreshToken: data.refresh_token,
               Validate: dVencRefreshToken,
            })

            console.log('Refresh token ', modelAuthorization)

            await modelAuthorization.save()

            return resolve(modelAuthorization)
         })
      }

      async function validarToken(model) {
         try {
            console.log('Validar token.')
            if (
               lodash.isEmpty(model.token) &&
               lodash.isEmpty(model.refreshToken)
            )
               throw {
                  success: false,
                  erroNr: 600,
                  message: 'É preciso autenticar.',
               }
            //const autVenc = moment(model.refreshTokenValidate).format() //.format('YYYY-MM-DD HH:MM:SS')
            const tokenVenc = moment(model.Validate).format('YYYY-MM-DD HH:MM:SS') //.format('YYYY-MM-DD HH:MM:SS')
            const agora = moment().format('YYYY-MM-DD HH:MM:SS')
            if (agora > tokenVenc) {
               try {
                  return await refreshToken(model)
               } catch (e) {
                  console.log('o refresh token falhou ', e)
                  throw e
               }
            }
            return model //.token
         } catch (e) {
            console.log('validarToken error ', e)
            throw e
         }
      }

      async function getRecurso(conta_id, recurso) {
         try {
            console.log('Recurso.')
            const model = await Database.from('bank_configs')
               .where('conta_id', conta_id)
               .andWhere('recurso', recurso)
               .first()

            if (!model) {
               throw {
                  success: false,
                  erroNr: 600,
                  message: 'Recurso não localizado. É preciso autenticar.',
               }
            }

            return validarToken(model)
         } catch (e) {
            return e
         }
      }

      async function getToken(config = null) {
         return new Promise(async (resolve, reject) => {
            try {
               console.log('getToken.')
               let oToken = await getRecurso(config.conta_id, config.recurso)
               return resolve({
                  token: oToken.token,
                  url: Env.get('SICOOB_URL_COBRANCA'),
                  tokenBasic: Env.get('SICOOB_TOKEN_BASIC'),
               })
            } catch (e) {
               return reject(e)
            }
         })
      }

      return { getToken, callback }
   } catch (e) {
      console.log('Auth error ', e)
      throw e
   }
}

module.exports = Auth
