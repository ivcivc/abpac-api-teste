'use strict'

const User = use('App/Models/mobile/UserMobile')
const Hash = use('Hash')

class MobileAuth {
	async handle(ctx, next) {
		const headers = ctx.request.headers()
		try {
			console.log('midle auth')
			if (!headers.authorization) {
				throw false
			}

			const authorization = headers.authorization.replace('Bearer ', '')

			if (!authorization) {
				throw { message: 'Token não informado' }
			}

			const user = await User.findBy('token', authorization)

			ctx.MobileAuth = {
				id: user.id,
				login: user.login,
				pessoa_id: user.pessoa_id,
			}

			if (!user) {
				throw { message: 'Token inválido.' }
			}

			if (user.isBlock) {
				throw { message: 'Usuário bloqueado' }
			}

			if (user.isNewPassword) {
				return false
			}

			if (authorization === user.token) await next()
		} catch (e) {
			response.status(401).send('Não autorizado.')
		}
	}
}

module.exports = MobileAuth
