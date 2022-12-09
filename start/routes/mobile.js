'use strict'

const Route = use('Route')
const serviceEquipamento= use("App/Mobile/Equipamento")
const servicePessoa= use("App/Mobile/Pessoa")
const serviceEquipamentoPDF = use("App/Mobile/relatorios/Pdf_Equipamento")
const serviceOcorrenciasPDF = use("App/Mobile/relatorios/Pdf_Ocorrencia")

Route.group(() => {
	Route.post('/login', async ({ request, response }) => {ocooooooodd
		const User = use('App/Models/mobile/UserMobile')
		const Hash = use('Hash')
		const bcrypt = use('crypto')
		const uuid = require('uuid')
		let isErr = null
		console.log('login ')
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
					pessoaId: user.pessoa_id,
					usuario: json.pessoa.nome,
					tipoPessoa: json.pessoa.tipoPessoa,
					cpfCnpj: json.pessoa.cpfCnpj,
					//p: json.pessoa
				})
		} catch (e) {
			console.log(e)
			let msg = e.message

			if (!isErr) {
				msg = 'Não foi possível realizar o login'
			}

			response.status(401).send({ message: msg })
		}
	})

	Route.post('/autologin', async ({ request, response }) => {
		const User = use('App/Models/mobile/UserMobile')

		let isErr = null
		
		try {
			const { login, token } = request.all()

			const user = await User.findBy('login', login)

			if (user.isBlock) {
				return response.status(400).send({ message: 'Sistema bloqueado' })
			}

			if (user.isNewPassword) {
				return response.status(400).send({ message: 'Sistema bloqueado. Entre em contato com a ABPAC.' })
			}

			if ( user.token != token) {
				return response.status(400).send({ message: 'Token inválido.' })
			}

			await user.load('pessoa')

			const json = user.toJSON()

			response
				.status(200)
				.send({
					login: user.login,
					token: user.token,
					pessoaId: user.pessoa_id,
					usuario: json.pessoa.nome,
					tipoPessoa: json.pessoa.tipoPessoa,
					cpfCnpj: json.pessoa.cpfCnpj,
					//p: json.pessoa
				})
		} catch (e) {
			console.log(e)
			let msg = e.message

			if (!isErr) {
				msg = 'Não foi possível realizar o login'
			}

			response.status(401).send({ message: msg })
		}
	})	

	Route.get('/features', () => console.log('features acionado...'))

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

	Route.get('/getEquipamentoQtd/:pessoa_id', async ({ params, response }) => {
		const pessoa_id = params.pessoa_id
		
		try {
			let res= await new serviceEquipamento().getEquipamentoQtd(pessoa_id)
			response.status(200).send( res )
		} catch (error) {
			response.status(400).send({message: error.message})
		}
		
		
	})

	Route.get('/getPessoa/:pessoa_id', async ({ params, response }) => {
		const pessoa_id = params.pessoa_id
		
		try {
			let res= await new servicePessoa().getPessoa(pessoa_id)
			response.status(200).send( res )
		} catch (error) {
			response.status(400).send({message: error.message})
		}
		
		
	})

	Route.get('/getEquipamentos/:pessoa_id', async ({ params, response }) => {
		const pessoa_id = params.pessoa_id
		console.log('Parametros= ', pessoa_id)
		
		try {
			let res= await new serviceEquipamento().getEquipamentos(pessoa_id)
			response.status(200).send( res )
		} catch (error) {
			response.status(400).send({message: error.message})
		}
	})

	Route.get('/ping', async ({response }) => {
		response.status(200).send('pong')
	})

	// equipamentos rateio - id= rateio_id + '_' + item.pessoa.id
	//Route.get('/rateio/equipamentoPreviewPDF/:id', 'RateioController.equipamentoPreviewPDF')

	//Route.get('/rateio/ocorrenciaPreviewPDF/:id', 'RateioController.ocorrenciaPreviewPDF')

	Route.post('/rateio/getEquipamentoPDF', async ({response, request}) => {
		//Retorno PDF das equipamento do rateio da pessoa
		//payload = {"rateio_id": 18,"retornarPDF": true, "pessoa_id": 3725}
		try {
			const payload= request.all()
			let ret= await new serviceEquipamentoPDF().getPdfEquipamentoRateio(payload)
	
			if (ret ) {
				return response
				   .header('Content-type', 'application/pdf')
				   .download(ret.pasta + ret.arquivo)
			}
	
			response.status(400).send({message: "PDF não localizado."})
		} catch (error) {
			response.status(400).send({message: "PDF não localizado."})
		}

	})
	
	Route.post('/rateio/getOcorrenciasPDF', async ({response, request}) => {
		//Retorno PDF das ocorrencias do rateio
		//payload = {"rateio_id": 18,"retornarPDF": true}
		try {
			const payload= request.all()
			let ret= await new serviceOcorrenciasPDF().getPdfOcorrenciasRateio(payload)
	
			if (ret ) {
				return response
				   .header('Content-type', 'application/pdf')
				   .download(ret.pasta + ret.arquivo)
			}
	
			response.status(400).send({message: "PDF não localizado."})
		} catch (error) {
			response.status(400).send({message: "PDF não localizado."})
		}

	})	

}).prefix('api/mobile')

