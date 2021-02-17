'use strict'

const fetch = require('node-fetch')
const { Headers } = require('node-fetch')
const moment = require('moment')
const ModelBankConfigAuthorizations = use(
   'App/Models/Bank/BankConfigAuthorization'
)
const ModelBankConfig = use('App/Models/Bank/BankConfig')
const Database = use('Database')
const Env = use('Env')
const lodash = use('lodash')
const ModelConta = use('App/Models/Conta')

function Auth() {
   let token = null
   let tokenDate = null
   let tokenMinutes = 58

   async function callback(res) {
      try {
         const modelConta = await ModelConta.findBy('modeloBoleto', 'sicoob')
         const modelBankConfig = await ModelBankConfig.findBy(
            'conta_id',
            modelConta.id
         )

         let conta_id = modelConta.id
         if (!modelConta.length === 0)
            throw {
               success: false,
               erroNr: 602,
               message: 'Conta/Modelo Sicoob não localizada.',
            }

         const para = new URLSearchParams({
            grant_type: 'authorization_code',
            code: res.code,
            redirect_uri: modelBankConfig.urlCallback,
         })

         const meta = {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${modelBankConfig.tokenBasic}`,
         }
         const headers = new Headers(meta)

         const url = modelBankConfig.urlAccessToken
         const response = await fetch(url, {
            method: 'POST',
            body: para,
            headers: headers,
         })
         const data = await response.json()

         let hoje = moment()
         let dVencToken = hoje.add(58, 'minute').format('YYYY-MM-DD HH:mm:ss')
         let dVencRefreshToken = hoje
            .add(1, 'month')
            .format('YYYY-MM-DD HH:mm:ss')

         await ModelBankConfigAuthorizations.query()
            .where('scope', data.scope)
            .where('bank_config_id', modelBankConfig.id)
            .update({
               refreshToken: data.refresh_token,
               token: data.access_token,
               refreshTokenValidate: dVencRefreshToken,
               tokenValidate: dVencToken,
            })

         return `<html><h1>oi</h1><script type="text/javascript" language="JavaScript">

                  setTimeout(() => {
                     window.close();
                  }, 500)

               </script></html>`

         //return {success: true, bank_config_id: modelBankConfig.id, conta_id, scope: data.scope, message: 'Autenticaçao concluida com sucesso'}
      } catch (error) {
         return error
      }
   }

   function getMinutesBetweenDates(startDate, endDate) {
      var diff = endDate.getTime() - startDate.getTime()
      return diff / 60000
   }

   async function refreshToken(model) {
      return new Promise(async (resolve, reject) => {
         const tokenVenc = moment(model.refreshTokenValidate).format() //.format('YYYY-MM-DD HH:MM:SS')
         const agora = moment().format() //.format('YYYY-MM-DD HH:MM:SS')
         if (agora > tokenVenc) {
            throw {
               success: false,
               erroNr: 600,
               message: 'É preciso autenticar.',
            }
         }

         // solicitar refresh
         const para = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: model.refreshToken,
         })

         const meta = {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${model.tokenBasic}`,
         }
         const headers = new Headers(meta)

         const response = await fetch(model.urlRefreshToken, {
            method: 'POST',
            body: para,
            headers: headers,
         })
         const data = await response.json()
         console.log('callback ', data)
         if (lodash.has(data, 'error')) {
            throw {
               success: false,
               erroNr: 601,
               message: data.error_description,
               error: data.error,
            }
         }

         let hoje = moment()
         let dVencRefreshToken = hoje
            .add(58, 'minute')
            .format('YYYY-MM-DD HH:mm:ss')

         //let di= d.add(1, 'day').format('YYYY-MM-DD HH:mm:ss')
         const modelAuthorization = await ModelBankConfigAuthorizations.findOrFail(
            model.id
         )
         modelAuthorization.merge({
            token: data.access_token,
            refreshToken: data.refresh_token,
            //refreshTokenValidate: dVencRefreshToken,
            tokenValidate: hoje.format('YYYY-MM-DD HH:mm:ss'),
         })

         await modelAuthorization.save()
         resolve(modelAuthorization.token)

         return data
      })
   }

   async function validarToken(model) {
      if (lodash.isEmpty(model.token) && lodash.isEmpty(model.refreshToken))
         throw { success: false, erroNr: 600, message: 'É preciso autenticar.' }
      const autVenc = moment(model.refreshTokenValidate).format() //.format('YYYY-MM-DD HH:MM:SS')
      const tokenVenc = moment(model.tokenValidate).format() //.format('YYYY-MM-DD HH:MM:SS')
      //tokenVenc= moment(tokenVenc).format('YYYY-MM-DD HH:MM:SS')
      const agora = moment().format()
      if (agora > tokenVenc || agora > autVenc) {
         return await refreshToken(model)
      }
      return model //.token
   }

   async function getScope(conta_id, scope) {
      const model = await Database.from('bank_configs')
         .select('*', 'bank_config_authorizations.id as alvo_id')
         .innerJoin(
            'bank_config_authorizations',
            'bank_configs.id',
            'bank_config_authorizations.bank_config_id'
         )
         .where('bank_configs.conta_id', conta_id)
         .andWhere('bank_config_authorizations.scope', scope)

      let dd = moment(model[0].tokenValidate)
      let ee = dd.format('YYYY-MM-DD HH:MM:SS')
      let jj = new Date(model[0].tokenValidate)
      let r = moment(model[0].tokenValidate, 'YYYY-MM-DD HH:MM:SS')
      if (model.length === 0)
         throw { success: false, message: 'Scope não cadastrado.' }

      let a = moment().format('YYYY-MM-DD HH:MM:SS')
      return validarToken(model[0])
   }

   async function getToken(config = null) {
      let oToken = await getScope(config.conta_id, config.scope)
      return {
         token: oToken.token,
         url: oToken.urlAccessToken,
         tokenBasic: oToken.tokenBasic,
      }
   }

   return { getToken, callback }
}

module.exports = Auth
