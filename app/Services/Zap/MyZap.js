'use strict'

const axios = require('axios')

const Env = use('Env')
const url_zap = Env.get('ZAP_URL')
const sessionName = Env.get('ZAP_SESSION')
let AuthToken = Env.get('ZAP_TOKEN')
const Drive = use('Drive')
const Helpers = use('Helpers')
const fs = require('fs')

AuthToken = '$2b$10$Pouu1He5.nnKHnrY_i.Qbup90uqys9FDBZBZqGwIlGPJdi_z5m2Ve'

axios.defaults.headers.common = {
	Authorization: `Bearer ${AuthToken}`,
	'Content-Type': 'application/json',
	Accept: 'application/json',
}

function MyZap() {
	async function sendMessage(tel, message) {
		return new Promise((resolve, reject) => {
			try {
				const url = url_zap + `/${sessionName}/send-message`

				axios({
					method: 'post',
					url: url,
					data: {
						phone: tel,
						message: message,
					},
				})
					.then(r => {
						//console.log('axios retornou ', r.toJSON())
						r.data.result = r.data.status
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
				const url = url_zap + `/${sessionName}/send-link-preview`
				console.log('link ', link)
				axios({
					method: 'post',
					url: url,
					data: {
						//sessionName: sessionName,
						phone: tel,
						caption: message,
						url: link,
					},
				})
					.then(r => {
						//console.log('axios retornou ', r.toJSON())
						r.data.result = r.data.status
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

	async function sendImage(tel, message, base64Data, fileName) {
		return new Promise((resolve, reject) => {
			try {
				const url = url_zap + '/sendImageStorie'

				axios({
					method: 'post',
					url: url,
					data: {
						sessionName: sessionName,
						//number: tel,
						base64Data,
						caption: message,
						fileName: fileName,
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
				const url = url_zap + `/${sessionName}/send-file-base64`

				let base64 = 'data:application/pdf;base64,' + base64Data

				axios({
					method: 'post',
					url: url,
					data: {
						sessionName: sessionName,
						phone: tel,
						isGroup: false,
						fileName,
						caption: message,
						base64,
					},
				})
					.then(r => {
						//console.log('axios retornou ', r.toJSON())
						r.data.result = r.data.status
						resolve(r.data)
					})
					.catch(e => {
						console.log('factory error ', e)
						reject(e)
					})

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

				const url = url_zap + `/${sessionName}/start-session`

				axios({
					method: 'post',
					url: url,
				})
					.then(r => {
						//console.log('axios retornou ', r.toJSON())
						let msg = 'Aguarde..... '
						if (r.data.qrcode) {
							msg = 'Aguarde qrCode. '
						}

						if (r.data.status === 'CLOSED') {
							msg = 'Status atual: Fechado. Aguarde... '
						}

						r.data.result = msg

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

				const url = url_zap + `/${sessionName}/close-session`

				axios({
					method: 'post',
					url: url,
				})
					.then(r => {
						//console.log('axios retornou ', r.toJSON())
						r.data.result = 'success'
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

				const url = url_zap + `/${sessionName}/check-connection-session`

				axios({
					method: 'get',
					url: url,
				})
					.then(r => {
						//console.log('axios retornou ', r.toJSON())
						r.data.result = r.data.message
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
		sendImage,
		start,
		close,
		status,
		test,
		qrcode,
	}
}

module.exports = MyZap
