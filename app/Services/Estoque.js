'use strict'

const Model = use('App/Models/Estoque')

const Database = use('Database')

class Estoque {
	async update(arrItems, data, trx = null, auth) {
		try {
			for (const key in arrItems) {
				if (Object.hasOwnProperty.call(arrDelete, key)) {
					const e = arrItems[key]
					const query = await Model.query()
						.where('entrada_id', e.id)
						.fetch()

					let isSaida = false // item estoque baixado/saiu do estoque
					let qtdSaida = 0 // quantidade que foi baixado
					let isUnitarioAlterado = false

					for (const i in query.rows) {
						if (Object.hasOwnProperty.call(query.rows, i)) {
							const q = query.rows[i] // estoque
							if (q.saida_id) {
								isSaida = true
								qtdSaida++
							}
							if (q.subtotal !== e.subTotal) {
								isUnitarioAlterado = true
							}
						}
					}

					if (query.rows.lenght === arrItems.quantidade) {
						if (isUnitarioAlterado && isSaida) {
							throw {
								success: false,
								message:
									'Não é possível alterar o valor unitário. Baixa de estoque detectado.',
							}
						}
						await Model.query()
							.where('entrada_id', e.id)
							.transacting(trx ? trx : null)
							.update({
								descricao: e.descricao,
								subtotal: e.subTotal,
							})
					}

					if (query.rows.lenght > arrItems.quantidade) {
						let dif = query.rows.lenght - arrItems.quantidade
						for (let add = 0; add <= dif - 1; add++) {
							await Model.create(
								{
									quantidade: 1,
									descricao: e.descricao,
									subtotal: e.subTotal,
									total: e.subTotal,
									entrada_id: e.id,
								},
								trx
							)
						}
					}

					if (query.rows.lenght < arrItems.quantidade) {
						let quantos = arrItems.quantidade - query.rows.lenght
						if (e.qtd - qtdSaida > quantos) {
							throw {
								success: false,
								message:
									'Não é possível excluir items de estoque que estão vinculados à baixa de estoque',
							}
						}
						await Model.query()
							.where('entrada_id', e.id)
							.whereNull('saida_id')
							.transacting(trx ? trx : null)
							.delete()
					}
				}
			}

			return true
		} catch (e) {
			throw {
				message: e.message,
				sqlMessage: e.sqlMessage,
				sqlState: e.sqlState,
				errno: e.errno,
				code: e.code,
				success: false,
			}
		}
	}

	async add(arr, trx, auth) {
		try {
			for (const key in arr) {
				if (Object.hasOwnProperty.call(arr, key)) {
					const element = arr[key]
					await Model.create(element, trx ? trx : null)
				}
			}
			return true
		} catch (e) {
			throw e
		}
	}

	async get(ID) {
		try {
			const model = await Model.findOrFail(ID)

			return model
		} catch (e) {
			throw e
		}
	}

	async index(where = null) {
		try {
			const model = Model.query()
			if (where) {
				model.where(where)
			}

			const res = await model.fetch()

			return model
		} catch (e) {
			throw e
		}
	}

	async localizarPor(payload) {
		return new Promise(async (resolve, reject) => {
			let field_name = payload.field_name
			//let field_value = payload.field_value
			let field_value_status = payload.field_value_status

			try {
				const query = Model.query().orderBy('descricao')

				switch (field_name) {
					case 'status':
						if (field_value_status === 'disponivel') {
							query.whereNull('saida_id')
							query.with('osEntrada')
						} else {
							query.whereNotNull('saida_id')
							query.with('osSaida')
						}

						break

					default:
						break
				}

				let retorno = await query.fetch()

				resolve(retorno)
			} catch (e) {
				reject(e)
			}
		})
	}
}

module.exports = Estoque
