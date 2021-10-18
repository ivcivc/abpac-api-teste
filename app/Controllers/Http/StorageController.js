'use strict'

const Env = use('Env')
const lodash = use('lodash')

const Database = use('Database')

const File = use('App/Models/File')
const FileItem = use('App/Models/FileItem')

const FileServices = use('App/Services/Storage')

const Helpers = use('Helpers')

const Kue = use('Kue')
const Job = use('App/Jobs/SincronizarDropbox')
const Redis = use('Redis')
const Drive = use('Drive')

class StorageController {
	async store({ request, response }) {
		console.log('store em ação')
		let { files } = request.only('files') // ID do file_items
		let payload = request.all()

		console.log('store em ação.......')
		let arrFiles = []
		let trx = null

		try {
			if (files) {
				arrFiles = files.split(',')
			}

			trx = await Database.beginTransaction()

			let status = 'Concluído'

			if (arrFiles.length === 0) {
				status = 'Pendente'
			}

			const fileModelItem = await File.create(
				{
					modulo: payload.modulo,
					descricao: payload.descricao,
					dVencimento: payload.dVencimento,
					idParent: payload.idParent,
					pessoa_id: payload.pessoa_id,
					status,
				},
				trx
			)

			for (let value of arrFiles) {
				const item = await FileItem.findOrFail(value)
				item.merge({ file_id: fileModelItem.id })
				await item.save(trx)
			}

			await trx.commit()

			console.log('commitado ', fileModelItem.id)

			this.setAddKue(fileModelItem.id)

			/*// Ativar envio para o Dropbox (kue), caso key == pendente.
        const query = await FileItem.query()
        .where('file_id', fileModelItem.id)
        .fetch()

        if ( query ) {
            query.rows.forEach( o => {
               console.log('query ', o.id)
               if ( o.key === 'pendente') {
                  const job= Kue.dispatch(Job.key, parseInt(o.id), {attempts: 3})
               }
            })
        }

        // fim envio para dropbox (kue)*/

			return response
				.status(200)
				.send({ status: 'server', id: fileModelItem.id })
		} catch (err) {
			await trx.rollback()
			return response.status(err.status).send({
				status: 'error',
				error: { message: 'Erro no cadastro de arquivo' },
			})
		}
	}

	async corregir() {
		// Correção de imagens que não foram para dropbox
		try {
			const query = await FileItem.query()
				.whereNotNull('file_id')
				.where('key', 'pendente')
				.fetch()

			query.rows.forEach(async e => {
				//const file= `file_${e.file_id}`
				const id = e.id
				await Redis.del(id)

				const job = Kue.dispatch(Job.key, parseInt(id), {
					attempts: 3,
				})
			})
			let msg = 'Não há registros a serem atualizados'
			if (query.rows.length > 0) {
				msg = `Disparo de ${query.rows.length} registro(s) realizado com sucesso`
			}
			return { success: true, message: msg }
		} catch (error) {
			return error.message
		}
	}

	async setAddKue(ID) {
		try {
			// Ativar envio para o Dropbox (kue), caso key == pendente.
			let query = await FileItem.query().where('file_id', ID).fetch()
			query.rows.forEach(o => {
				console.log('query : ', o.key)
				if (o.key === 'pendente') {
					console.log('dispatch tarefa ', o.key, ' ', o.id)
					const job = Kue.dispatch(Job.key, parseInt(o.id), {
						attempts: 3,
					})
				}
			})
			// fim envio para dropbox (kue)
		} catch (err) {
			return err
		}
	}

	// espera= async () => {return new Promise((resolve) => { setTimeout( (x) => { resolve('ok'); }, 50 ) }) }

	async upload({ request, response }) {
		try {
			console.log('entrando upload....')

			const validationOptions = {
				types: ['image', 'pdf', 'application', 'plain', 'text'],
				size: '40mb',
				extnames: [
					'png',
					'PNG',
					'gif',
					'GIF',
					'pdf',
					'PDF',
					'doc',
					'DOC',
					'docx',
					'DOCX',
					'xls',
					'XLS',
					'xlsx',
					'XLSX',
					'bmp',
					'BMP',
					'tif',
					'TIF',
					'jpg',
					'JPG',
					'jpeg',
					'JPEG',
					'jfif',
					'JFIF',
					'txt',
					'TXT',
					'vp',
					'VP',
				],
			}

			if (!request.file('upload')) throw upload.error()
			const upload = request.file('upload', validationOptions)

			const fileName = `${Date.now()}.${upload.extname}`

			console.log('upload ', upload)

			await upload.move(Helpers.tmpPath('uploads'), {
				name: fileName,
			})

			if (!upload.moved()) {
				console.log('move falhou ')
				let error = upload.error()
				error.status = 400
				throw error
			}

			console.log('passou pelo move ')

			const fileModelItem = await FileItem.create({
				file: fileName,
				name: upload.clientName
					.normalize('NFD')
					.replace(/[^a-zA-Zs0-9.]/g, ''),
				path:
					'/' +
					upload.clientName
						.normalize('NFD')
						.replace(/[^a-zA-Zs0-9.]/g, ''),
				type: upload.type,
				subtype: upload.subtype,
				key: 'pendente',
				status: 'Aprovado',
			})

			//console.log('enviar um dispach ')

			//const job= Kue.dispatch(Job.key, parseInt(fileModelItem.id), {attempts: 3})

			return { arquivo: fileName, value: fileModelItem.id, status: 'server' }
		} catch (err) {
			console.log('catch ', err)
			if (lodash.has(err, 'type')) {
				console.log('tipo: ', err.type)
				if (err.type === 'size') {
					err.message = `Arquivo: ${err.clientName}.</br>Tamanho de arquivo deve ser menor que 40MB.`
				}

				if (err.type === 'extname') {
					err.message = `Arquivo: ${err.clientName}.</br>Extensão de arquivo não permitida.`
				}

				if (err.type === 'size' && err.type === 'extname') {
					err.message = `Arquivo: ${err.clientName}.</br>Extensão de arquivon não permitida e tamanho de arquivo superior a 40MB.`
				}

				if (err.type === 'type') {
					err.message = `Arquivo: ${err.clientName}.</br>Tipo de arquivo não permitido para upload.`
				}

				return response
					.status(err.status)
					.send({ status: 'error', error: { message: err.message } })
			}

			return response.status(err.status).send({
				status: 'error',
				error: { message: 'Erro no upload de arquivo' },
			})
		}
	}

	async update({ request, response, params }) {
		let trx = null

		const payload = request.all()
		const ID = params.id
		let items = payload.FileItems
		if (items) {
			items = JSON.parse(items)
		}

		payload.FileItems = items

		try {
			trx = await Database.beginTransaction()

			const file = await new FileServices().update(ID, payload, trx)

			await trx.commit()

			this.setAddKue(ID)

			/*await Redis.set('dropbox',  JSON.stringify({'1': 'arquivo1', '2': 'arquivo2'}))
         const r= await Redis.get('dropbox')
         console.log('redis ', r)
         const obj = JSON.parse(r)
         console.log('redis ', obj['1'])

         const l = lodash.find('3')
         console.log('lodash ', l)

         const user = {
            username: 'foo',
            email: 'foo@bar.com'
          }
          const user2 = {
            username: 'foo2',
            email: 'foo@bar2.com'
          }
          await Redis.hmset('userss', user.username, JSON.stringify(user))
          await Redis.hmset('userss', user2.username, JSON.stringify(user2))
          await Redis.hmset('userss', user2.username, JSON.stringify(user2))

          console.log( '=> ', await Redis.hmget('userss', user.username))
          console.log( '=> ', await Redis.hmget('userss', user2.username))
          Redis.hdel('userss', user2.username)
          console.log( 'DEL => ', await Redis.hmget('userss', user2.username))
*/
			//const job= Kue.dispatch(Job.key, parseInt(ID), {attempts: 3})

			//const job= Kue.dispatch(Job.key, parseInt(ID), {attempts: 3})

			response.status(200).send({ type: true, data: file })
		} catch (error) {
			await trx.rollback()
			console.log(error)
			response.status(400).send(error)
		}
	}
}

module.exports = StorageController
