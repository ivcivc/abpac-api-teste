'use strict'

const Env = use('Env')
const File = use('App/Models/File')
const FileItem = use('App/Models/FileItem')
const Database = use('Database')

const Kue = use('Kue')
const Job = use('App/Jobs/SincronizarDropbox')

class Storage {
	async update(ID, data, trx) {
		try {
			let file = await File.findOrFail(ID)
			let items = data.FileItems
			delete data.FileItems

			let arr_files_id = []
			if (data.files) {
				arr_files_id = data.files.split(',')
			}

			delete data.files

			if (!data.updateStatus) {
				//delete data['status']
				delete data['file']
			}

			file.merge(data)

			if (items) {
				items.forEach(e => {
					delete e.link
					delete e.key
					delete e.file
					delete e.name
					delete e.path
					delete e.type
					delete e.subtype
				})
				for (let e in items) {
					let x = 1
					await file
						//.transacting(trx)
						.FileItems()
						.where('id', items[e].id)
						.update(items[e])
				}
			}

			await file.save(trx ? trx : null)

			if (arr_files_id.length > 0) {
				for (let e in arr_files_id) {
					let itemId = arr_files_id[e]
					let itemModel = await FileItem.findOrFail(itemId)
					itemModel.merge({ file_id: ID })
					await itemModel.save(trx ? trx : null)
					if (itemModel.key === 'pendente') {
						const job = Kue.dispatch(Job.key, parseInt(itemModel.id), {
							attempts: 3,
						})
					}
				}
			}

			return file
		} catch (e) {
			throw {
				message: e.message,
				sqlMessage: e.sqlMessage,
				sqlState: e.sqlState,
				errno: e.errno,
				code: e.code,
			}
		}
	}

	async addSign(payload, trx = null) {
		console.log('Adicionar um documento digital numa arquivo de galeria')

		let items = payload.items
		delete payload['items']

		try {
			const file = await File.create(
				{
					modulo: payload.modulo,
					descricao: payload.descricao,
					dVencimento: payload.dVencimento,
					idParent: payload.idParent,
					pessoa_id: payload.pessoa_id,
					status: payload.status,
				},
				trx
			)

			for (let value of items) {
				await FileItem.create(
					{
						file_id: file.id,
						key: 'pendente',
						file: value.file,
						name: value.name,
						path: value.path,
						type: value.type,
						subtype: value.subtype,
						status: value.status,
						isSignOriginal: value.isSignOriginal,
						sign_id: value.sign_id,
					},
					trx
				)
			}

			console.log('commitado ', file.id)

			//this.setAddKue(fileModelItem.id)

			return { success: true, file_id: file.id }
		} catch (err) {
			return {
				success: false,
				status: 'error',
				error: { message: 'Erro no cadastro de arquivo' },
			}
		}
	}

	async SignAddKue(file_id) {
		try {
			// Ativar envio para o Dropbox (kue), caso key == pendente.
			let query = await FileItem.query().where('file_id', file_id).fetch()
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
}

module.exports = Storage
