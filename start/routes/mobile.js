'use strict'

const Route = use('Route')

Route.group(() => {
	Route.post('/login', async ({ request, response }) => {
		const User = use('App/Models/mobile/UserMobile')
		const Hash = use('Hash')
		const bcrypt = use('crypto')
		const uuid = require('uuid')
		let isErr = null

		try {
			const { login, password } = request.all()

			const user = await User.findBy('login', login)

			if (user.isBlock) {
				return response.status(400).send({ message: 'Sistema bloqueado' })
			}

			const isSame = await Hash.verify(password, user.password)

			if (!isSame) {
				if (user.isNewPassword) {
					return response
						.status(401)
						.send({ message: 'Informe uma nova senha' })
				}
				return response
					.status(400)
					.send({ message: 'Usuário ou senha inválido' })
			}

			if (user.isNewPassword) {
				return response
					.status(401)
					.send({ message: 'Informe uma nova senha' })
			}

			const token = uuid.v4()

			user.merge({ token })
			await user.save()
			await user.load('pessoa')

			const json = user.toJSON()

			response
				.status(200)
				.send({
					login: user.login,
					token: user.token,
					pessoa_id: user.pessoa_id,
				})
		} catch (e) {
			let msg = e.message

			if (!isErr) {
				msg = 'Não foi possível realizar o login'
			}

			response.status(401).send({ message: msg })
		}
	})

	Route.get('/checkToken', async ({ MobileAuth }) => {
		return MobileAuth
	}).middleware(['MobileAuth'])

	Route.post('/users', () => {
		/*const User = use('App/Models/mobile/UserMobile')

		const { email, password } = request.all()

		const token = await auth.withRefreshToken().attempt(email, password)

		try {
			await auth.check()
		} catch (error) {
			console.log('falhouuuuuuuuuuuuuuuuuuu')
			response.send(error.message)
		}

		const user = await auth.getUser()

		const namePart = user.username.split(' ')

		const id = user.id
		const name = user.username
		const firstname = namePart[0]
		const lastname =
			namePart.length === 1 ? '' : namePart[namePart.length - 1]
		const avatar = `/static/doc-images/lists/men1.png`
		const status = {
			color: 'success',
			icon: 'check_circle',
		}

		const userAdd = { id, name, firstname, lastname, avatar, status }*/

		return Object.assign({}, userAdd, token)
	})
}).prefix('api/mobile')
