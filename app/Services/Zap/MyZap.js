'use strict'

const axios = require('axios')

const Env = use('Env')
const url_zap = Env.get('ZAP_URL')
const sessionName = Env.get('ZAP_SESSION')
const Drive = use('Drive')
const Helpers = use('Helpers')
const fs = require('fs')

function MyZap() {
   async function sendMessage(tel, message) {
      return new Promise((resolve, reject) => {
         try {
            const url = url_zap + '/sendText'

            axios({
               method: 'post',
               url: url,
               data: {
                  sessionName: sessionName,
                  number: tel,
                  text: message,
               },
            })
               .then(r => {
                  //console.log('axios retornou ', r.toJSON())
                  resolve(r.data)
               })
               .catch(e => {
                  reject({ result: 'falha', message: e.message })
               })

            //console.log('retorno ', data)
            //return resolve(data)
         } catch (e) {
            console.log('factory error ', e)
            reject(e)
         }
      })
   }

   async function sendLink(tel, message, link) {
      return new Promise((resolve, reject) => {
         try {
            const url = url_zap + '/sendLink'
            console.log('link ', link)
            axios({
               method: 'post',
               url: url,
               data: {
                  text: message,
                  sessionName: sessionName,
                  number: tel,
                  caption: message,
                  url: link,
               },
            })
               .then(r => {
                  //console.log('axios retornou ', r.toJSON())
                  resolve(r.data)
               })
               .catch(e => {
                  reject({ result: 'falha', message: e.message })
               })

            //console.log('retorno ', data)
            //return resolve(data)
         } catch (e) {
            console.log('factory error ', e)
            reject(e)
         }
      })
   }

   async function sendFile(tel, message, fileName, base64Data) {
      return new Promise((resolve, reject) => {
         try {
            const url = url_zap + '/sendFile'

            axios({
               method: 'post',
               url: url,
               data: {
                  sessionName: sessionName,
                  number: tel,
                  fileName,
                  caption: message,
                  base64Data,
               },
            })
               .then(r => {
                  //console.log('axios retornou ', r.toJSON())
                  resolve(r.data)
               })
               .catch(e => {})

            //console.log('retorno ', data)
            //return resolve(data)
         } catch (e) {
            console.log('factory error ', e)
            reject(e)
         }
      })
   }

   async function start(session = null) {
      return new Promise((resolve, reject) => {
         try {
            if (session) sessionName = session

            const url = url_zap + '/start?sessionName=' + sessionName

            axios({
               method: 'get',
               url: url,
            })
               .then(r => {
                  //console.log('axios retornou ', r.toJSON())
                  resolve(r.data)
               })
               .catch(e => {
                  reject({ result: 'falha', message: e.message })
               })

            //console.log('retorno ', data)
            //return resolve(data)
         } catch (e) {
            console.log('factory error ', e)
            reject(e)
         }
      })
   }

   async function close(session = null) {
      return new Promise((resolve, reject) => {
         try {
            if (session) sessionName = session

            const url = url_zap + '/close?sessionName=' + sessionName

            axios({
               method: 'get',
               url: url,
            })
               .then(r => {
                  //console.log('axios retornou ', r.toJSON())
                  resolve(r.data)
               })
               .catch(e => {
                  reject({ result: 'falha', message: e.message })
               })

            //console.log('retorno ', data)
            //return resolve(data)
         } catch (e) {
            console.log('factory error ', e)
            reject(e)
         }
      })
   }

   async function status(session = null) {
      return new Promise((resolve, reject) => {
         try {
            if (session) sessionName = session

            const url = url_zap + '/status?sessionName=' + sessionName

            axios({
               method: 'get',
               url: url,
            })
               .then(r => {
                  //console.log('axios retornou ', r.toJSON())
                  resolve(r.data)
               })
               .catch(e => {
                  reject({ result: 'falha', message: e.message })
               })

            //console.log('retorno ', data)
            //return resolve(data)
         } catch (e) {
            console.log('factory error ', e)
            reject(e)
         }
      })
   }

   async function test(tel = '31987034132') {
      return new Promise(async (resolve, reject) => {
         try {
            tel = '55' + tel

            const r = await sendMessage(tel, 'ABPAC - Teste ZAP')

            return resolve(r)
         } catch (e) {
            console.log('factory error ', e)
            reject(e)
         }
      })
   }

   async function qrcode(session = null) {
      return new Promise(async (resolve, reject) => {
         try {
            if (session) sessionName = session

            const url = url_zap + '/qrcode?sessionName=' + sessionName //+ '&&image=true'

            axios({
               method: 'get',
               url: url,
            })
               .then(async r => {
                  const pasta = Helpers.publicPath('images/')

                  resolve(r.data)
                  //const bin = Buffer.from(r.data)
                  //await Drive.put(pasta + 'qrcode.png', Buffer.from(r.data))
                  /*fs.writeFile(
                     pasta + 'qrcode.png',
                     r.data,
                     'base64',
                     async (err, data) => {
                        if (err) {
                           return console.log(err)
                           throw { message: 'Falha na gravação do qrcode' }
                        }
                        console.log(data)
                        const arquivo = Helpers.publicPath('images/qrcode.png')
                        //console.log('axios retornou ', r.toJSON())
                        resolve(arquivo)
                     }
                  )*/
               })
               .catch(e => {
                  reject({ result: 'falha', message: e.message })
               })

            //console.log('retorno ', data)
            //return resolve(data)
         } catch (e) {
            console.log('factory error ', e)
            reject(e)
         }
      })
   }
   return {
      sendMessage,
      sendLink,
      sendFile,
      start,
      close,
      status,
      test,
      qrcode,
   }
}

module.exports = MyZap
