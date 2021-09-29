const Env = use('Env')
const fetch = require('node-fetch')
const { Headers } = require('node-fetch')
const lodash = require('lodash')

async function sms() {
	try {
		async function saldo() {
			try {
				const headers = new Headers({
					'Content-Type': 'application/json',
				})

				const login = '&lgn=' + Env.get('SMS_LOGIN')
				const senha = '&pwd=' + Env.get('SMS_SENHA')
				const url =
					Env.get('SMS_LINK') +
					'/index.php?action=getbalance' +
					login +
					senha

				const response = await fetch(url, {
					method: 'GET',
					headers: headers,
				})

				if (response.status !== 200) {
					throw {
						success: false,
						erroNr: response.status,
						message: 'Ocorreu uma falha no servidor SMS!',
					}
				}

				let resposta = await response.json()

				return resposta
			} catch (e) {
				let obj = e

				if (!lodash.has(e, 'erroNr')) {
					obj = {
						message: 'Ocorreu um erro de comunicação com o servidor SMS.',
						status: e.type,
						erroNr: e.errno,
						statusText: e.stack,
					}
				} else {
					return e
				}

				return obj
			}
		}

		async function caixa_entrada() {
			const headers = new Headers({
				'Content-Type': 'application/json',
			})

			const login = '&lgn=' + Env.get('SMS_LOGIN')
			const senha = '&pwd=' + Env.get('SMS_SENHA')
			const url = Env.get('SMS_LINK') + '?action=GetResposta' + login + senha

			const response = await fetch(url, {
				method: 'GET',
				headers: headers,
			})

			if (response.status !== 200) {
				throw {
					success: false,
					erroNr: response.status,
					message: 'Ocorreu uma falha no servidor SMS!',
				}
			}

			let resposta = await response.json()

			return resposta
		}

		async function enviar(o) {
			try {
				const headers = new Headers({
					'Content-Type': 'application/json',
				})

				o.numero = o.numero.replace(/\D/g, '')
				o.identificador = o.identificador ? o.identificador : ''
				o.flash = o.flash ? o.flash : false
				o.mensagem = o.mensagem
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, '')

				const login = Env.get('SMS_LOGIN')
				const senha = Env.get('SMS_SENHA')
				const url = Env.get('SMS_LINK') + '/index_lote.php?action=send-sms'

				const json = {
					usuario: login,
					senha: senha,
					mensagens: [o],
				}

				const jsonCompile = JSON.stringify(json)

				console.log(jsonCompile)

				const response = await fetch(url, {
					method: 'POST',
					headers: headers,
					body: jsonCompile,
				})

				if (response.status !== 200) {
					throw {
						success: false,
						erroNr: response.status,
						message: 'Ocorreu uma falha no servidor SMS!',
					}
				}

				let resposta = await response.json()

				return resposta[0]

				/* Retorno
               {
                  "status": "1",
                  "data": "8265078",
                  "identificador": "",
                  "qtd_sms": "1",
                  "msg": "Operacao realizada com sucesso"
               }
               */
			} catch (e) {
				let obj = e

				if (!lodash.has(e, 'erroNr')) {
					obj = {
						message: 'Ocorreu um erro de comunicação com o servidor SMS.',
						status: e.type,
						erroNr: e.errno,
						statusText: e.stack,
					}
				} else {
					return e
				}

				throw obj
			}
		}

		return {
			saldo,
			caixa_entrada,
			enviar,
		}
	} catch (e) {
		console.log('Ocorreu falha no módulo SMS', e)
		return e
	}
}

module.exports = sms
