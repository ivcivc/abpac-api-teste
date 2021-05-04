'use strict'

const axios = require('axios')

const Env = use('Env')
const url_zap = Env.get('ZAP_URL')
const sessionName = Env.get('ZAP_SESSION')

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

   return { sendMessage, sendLink, sendFile }
}

module.exports = MyZap
