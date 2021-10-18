'use strict'

//const { Dropbox } = require("dropbox")

const Helpers = use('Helpers')

const Redis = use('Redis')
const File = use('App/Models/File')
const FileItem = use('App/Models/FileItem')
const FileNotification = use('App/Models/FileNotification')

const fetch = require('isomorphic-fetch') // or another library of choice.
const Dropbox = require('dropbox').Dropbox
const dbx = new Dropbox({
	accessToken:
		'Oa8F7Dr5mzAAAAAAAAAAdCtu2ZHPDca4bFFIBz_uuRhcTRoXHRjtf_CZJqz7rOPp',
	fetch,
})
const Env = use('Env')

const Drive = use('Drive')

class SincronizarDropbox {
	// If this getter isn't provided, it will default to 1.
	// Increase this number to increase processing concurrency.
	static get concurrency() {
		return 1
	}

	// This is required. This is a unique key used to identify this job.
	static get key() {
		return 'SincronizarDropbox-job'
	}

	/*async redis_add(ID, arquivo) {
   await Redis.set('dropbox',  JSON.stringify({'1': 'arquivo1', '2': 'arquivo2'}))
   const r= await Redis.get('dropbox')
  }*/

	async redis_delete(ID) {
		const id = `file_${ID}`
		await Redis.del(id)
	}

	async redis_get_continue(ID, arquivo) {
		console.log('redis - metodo GET ')
		const id = `file_${ID}`
		const r = await Redis.get(id)

		if (r) {
			if (await Drive.exists(Helpers.tmpPath('uploads') + arquivo)) {
				return false
			} else {
				await Redis.del(id)
				return false
			}
		} else {
			await Redis.set(id, arquivo)
		}
		return true
	}

	// This is where the work is done.
	async handle(ID) {
		console.log('ID: ', ID)

		return new Promise(async (resolve, reject) => {
			try {
				if (!ID) {
					return reject(ID)
				}
				const item = await FileItem.findOrFail(ID)
				const modelFile = await File.findOrFail(item.file_id)

				if (item.key !== 'pendente') {
					return resolve(true)
				}

				if (this.redis_get_continue(item.id, item.file) === false) {
					console.log(`ID: ${item.id} em processamento...`)
					return resolve(true)
				}

				const filePath = '/' + item.file

				if (await Drive.exists(Helpers.tmpPath('uploads') + filePath)) {
					const binario = await Drive.get(
						Helpers.tmpPath('uploads') + filePath
					)

					const pastaTeste =
						Env.get('NODE_ENV') === 'production' ? '' : '/teste'

					const modulo = modelFile.modulo.replace('|', '/')

					const caminho_arquivo =
						pastaTeste +
						'/' +
						modulo +
						'/' +
						modelFile.idParent +
						filePath

					let res = await dbx.filesUpload({
						path: caminho_arquivo,
						contents: binario,
					})

					item.key = res.id
					await item.save()

					let x = await Drive.delete(Helpers.tmpPath('uploads') + filePath)

					this.redis_delete(item.id)
				} else {
					console.log('criar uma file Notification ')
					await FileNotification.create({
						file_id: ID,
						descricao: `O arquivo (${item.path}) não foi localizado no servidor.`,
					})
					throw `Arquivo ${filePath} não localizado}`
				}

				resolve(true)
			} catch (err) {
				console.log('rejeitado....', err)
				return reject(err)
			}
		})
	}
}

module.exports = SincronizarDropbox

