'use strict'
const lodash = require('lodash')
const moment = require('moment')
const Beneficio = require('../Models/Beneficio')
const EquipamentoEndossoItem = require('../Models/EquipamentoEndossoItem')

const Model = use('App/Models/Equipamento')
const EquipamentoStatus = use('App/Models/EquipamentoStatus')
const EquipamentoProtecao = use('App/Models/EquipamentoProtecao')
const ModelEquipamentoRestricao = use('App/Models/EquipamentoRestricao')
const ModelRestricao = use('App/Models/Restricao')
const EquipamentoProtecaoService = use('App/Services/EquipamentoProtecao')
const ModelOcorrencia = use('App/Models/Ocorrencia')
const EquipamentoBeneficioService = use('App/Services/EquipamentoBeneficio')
const EquipamentoBeneficio = use('App/Models/EquipamentoBeneficio')
const ServiceConfig = use('App/Services/LancamentoConfig')
const FileConfig = use('App/Models/FileConfig')
const Galeria = use('App/Models/File')
const LancamentoService = use('App/Services/Lancamento')
const ModelCategoria = use('App/Models/Categoria')
const ModelBeneficio = use('App/Models/Beneficio')
const ModelEquipamentoLog = use('App/Models/EquipamentoLog')
const ModelEquipamentoControle = use('App/Models/EquipamentoControle')
const ModelEquipamentoControleLog = use('App/Models/EquipamentoControleLog')
const ModelEquipamentoEndosso = use('App/Models/EquipamentoEndosso')
const ModelEquipamentoEndossoItem = use('App/Models/EquipamentoEndossoItem')
const ModelSign = use('App/Models/Sign')

const Env = use('Env')

const DB_DATABASE = Env.get('DB_DATABASE')

//const ModelRateioEquipamento = use('App/Models/RateioEquipamento')

const Database = use('Database')

class Equipamento {
	async update(ID, data, trx, auth) {
		let showNewTrx = false

		try {
			if (!trx) {
				showNewTrx = true
				trx = await Database.beginTransaction()
			}

			if (await this.isDuplicidadePlaca(ID, data.placa1)) {
				throw { message: 'Placa em duplicidade.', code: '666' }
			}

			let equipamento = await Model.findOrFail(ID)
			await equipamento.load('equipamentoRestricaos.restricao')

			const equipamentoOriginalJSON = equipamento.toJSON()

			let addRestricoes = []

			if (lodash.has(data, 'equipamentoRestricaos')) {
				addRestricoes = data.equipamentoRestricaos
			}
			//let protecoes= data['protecoes']

			delete data['status']
			delete data['protecoes']
			delete data['categoria']
			delete data['equipamentoRestricaos']
			delete data['equipamentoSigns']
			delete data['logs']

			if (
				lodash.has(data, 'placa1') &&
				lodash.has(data, 'placa2') &&
				lodash.has(data, 'placa3')
			) {
				data.placas = gerarPlacas(data)
			}

			equipamento.merge(data)

			await this.addLog(equipamento, auth, trx)

			await equipamento.save(trx ? trx : null)

			await ModelEquipamentoRestricao.query()
				.where('equipamento_id', equipamento.id)
				.transacting(trx ? trx : null)
				.delete()

			if (addRestricoes) {
				const mRestri = await equipamento
					.equipamentoRestricaos()
					.createMany(addRestricoes, trx ? trx : null)
			}

			// Log de restriçoes
			let isLogRestricao = false
			let restricao_sai = ''
			let restricao_entra = ''
			let arrRestricao = []
			let arrRestricaoEntra = []
			equipamentoOriginalJSON.equipamentoRestricaos.forEach(e => {
				arrRestricao.push(parseInt(e.restricao_id))
				restricao_sai += restricao_sai == '' ? '' : ', '
				restricao_sai += e.restricao.descricao
			})
			addRestricoes.forEach(e => {
				arrRestricao.push(parseInt(e.restricao_id))
				arrRestricaoEntra.push(e.restricao_id)
			})
			let objRestricao = lodash.groupBy(arrRestricao)
			Object.keys(objRestricao).forEach(e => {
				if (objRestricao[e].length < 2) {
					isLogRestricao = true
				}
			})
			if (isLogRestricao) {
				const modelRestricao = await ModelRestricao.query()
					.whereIn('id', arrRestricaoEntra)
					.fetch()
				modelRestricao.rows.forEach(e => {
					restricao_entra += restricao_entra == '' ? '' : ', '
					restricao_entra += e.descricao
				})

				restricao_entra =
					restricao_entra == '' ? 'sem restrições' : restricao_entra
				restricao_sai =
					restricao_sai === '' ? 'sem restrições' : restricao_sai

				const o = {
					field: 'Restrições',
					valueOld: restricao_sai,
					valueNew: restricao_entra,
					equipamento_id: equipamento.id,
					user_id: auth.user.id,
					isVisible: true,
				}

				await ModelEquipamentoLog.create(o, trx ? trx : null)
			}
			/// Fim log de restrição

			// Protecoes (localizador e bloqueador)
			/*if ( protecoes) {
         for (let i=0; i < protecoes.length; i++ ) {
            let item = protecoes[i]
            item.equipamento_id= equipamento.id
        }

        const protecaoServ = await new EquipamentoProtecaoService().add( equipamento.id,protecoes, trx, auth)
        //const protecaoServ = await new EquipamentoProtecaoService().update(equipamento.id, protecoes, trx, auth)
        let a=1
      }*/

			if (showNewTrx) {
				await trx.commit()
			}

			/*await equipamento.load('equipamentoStatuses')
      await equipamento.load('pessoa')
      await equipamento.load('equipamentoProtecoes')
      let bene = await equipamento.load('equipamentoBeneficios')
      console.log(bene)
     // await equipamento.with('equipamentoBeneficios.beneficio')
      //await bene.load('beneficio')
      await equipamento.load('categoria')*/

			const query = await Model.query()
				.where('id', equipamento.id)
				.with('equipamentoStatuses')
				.with('pessoa')
				.with('categoria')
				.with('equipamentoProtecoes')
				.with('equipamentoBeneficios')
				.with('equipamentoBeneficios.beneficio')
				.with('equipamentoRestricaos', builder => {
					// builder.with('restricao')
				})
				/*.with('posts.comments', (builder) => {
            builder.where('approved', true)
         })*/
				.fetch()

			return query
		} catch (e) {
			if (showNewTrx) {
				await trx.rollback()
			}

			throw {
				message: e.message,
				sqlMessage: e.sqlMessage,
				sqlState: e.sqlState,
				errno: e.errno,
				code: e.code,
			}
		}
	}

	async add(data, trx, auth) {
		let showNewTrx = false

		try {
			console.log('metodo add')

			let protecoes = data.protecoes
			let beneficios = data.beneficios

			let addRestricoes = null

			if (lodash.has(data, 'equipamentoRestricaos')) {
				addRestricoes = data.equipamentoRestricaos
			}

			delete data['protecoes']
			delete data['beneficios']
			delete data['equipamentoRestricaos']

			if (!trx) {
				showNewTrx = true
				trx = await Database.beginTransaction()
			}

			if (await this.isDuplicidadePlaca(null, data.placa1)) {
				throw { message: 'Placa em duplicidade.', code: '666' }
			}

			//data.status = 'Ativo'
			data.placas = gerarPlacas(data)

			const equipamento = await Model.create(data, trx ? trx : null)
			equipamento.idPrincipal = equipamento.id

			const status = {
				equipamento_id: equipamento.id,
				user_id: auth.user.id,
				motivo: 'Inclusão de Equipamento gerado pelo sistema.',
				status: data.status,
			}
			await EquipamentoStatus.create(status, trx ? trx : null)

			// Protecoes (localizador e bloqueador)
			if (protecoes) {
				for (let i = 0; i < protecoes.length; i++) {
					let item = protecoes[i]
					item.equipamento_id = equipamento.id
				}

				await new EquipamentoProtecaoService().add(
					{
						equipamento,
						controle: { motivo: 'Novo Equipamento', acao: 'INCLUSÃO' },
					},
					protecoes,
					trx,
					auth
				)
			}

			if (beneficios) {
				for (const key in beneficios) {
					if (beneficios.hasOwnProperty(key)) {
						const element = beneficios[key]
						element.equipamento_id = equipamento.id
						await new EquipamentoBeneficioService().add(
							element,
							trx,
							auth,
							equipamento
						)
					}
				}
			}

			/*if (addRestricoes) {
            for (const key in addRestricoes) {
               if (addRestricoes.hasOwnProperty(key)) {
                  const element = addRestricoes[key]
                  element.equipamento_id = equipamento.id
                  await ModelEquipamentoRestricao.create(
                     element,
                     trx ? trx : null
                  )
               }
            }
         }*/

			const fileConfig = await FileConfig.query()
				.where('modulo', 'like', 'Equipamento')
				.fetch()

			for (const i in fileConfig.rows) {
				const payload = {
					descricao: fileConfig.rows[i].descricao,
					modulo: fileConfig.rows[i].modulo,
					idParent: equipamento.id,
					pessoa_id: equipamento.pessoa_id,
					status: 'Pendente',
				}
				const model = await Galeria.create(payload, trx)
			}

			if (addRestricoes) {
				await equipamento
					.equipamentoRestricaos()
					.createMany(addRestricoes, trx ? trx : null)
			}

			if (showNewTrx) {
				await trx.commit()
			}

			/*await equipamento.load('equipamentoStatuses')
         await equipamento.load('pessoa')
         await equipamento.load('equipamentoProtecoes')
         await equipamento.load('categoria')*/

			const query = await Model.query()
				.where('id', equipamento.id)
				.with('equipamentoStatuses')
				.with('pessoa')
				.with('categoria')
				.with('equipamentoSigns')
				.with('equipamentoProtecoes')
				.with('equipamentoBeneficios')
				.with('equipamentoBeneficios.beneficio')
				.with('equipamentoRestricaos', builder => {
					//builder.with('restricao')
				})
				.fetch()

			return query
		} catch (e) {
			if (showNewTrx) {
				await trx.rollback()
			}

			throw e
		}
	}

	async totalAtivos(payload, trx, auth) {
		const { pessoa_id, equipamento_id } = payload
		try {
			const count = await Database.from('equipamentos')
				.count('* as total')
				.where('pessoa_id', pessoa_id)
				.where('status', 'Ativo')

			const total = count[0].total

			const rateio_equipa = await Database.from('rateio_equipamentos')
				//.where('pessoa_id', pessoa_id)
				.where('equipamento_id', equipamento_id)
				.orderBy('rateio_id', 'desc')

			let rateio = null

			if (rateio_equipa.length === 0) {
				rateio = { rateio_id: null }
			} else {
				rateio = rateio_equipa[0]
			}

			return { success: true, total, rateio }
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async locBaixarTodosEquipamentos(pessoa_id = null, trx, auth) {
		// Modulo de baixa de todos os euipamentos de um associado. Cancelamento
		try {
			const query = await Database.from('equipamentos')
				.where('pessoa_id', pessoa_id)
				.where('status', 'Ativo')

			const queryBaixados = await Database.from('equipamentos')
				.where('pessoa_id', pessoa_id)
				.where('status', 'Inativo')
				.where('baixa', 'Sim')
				.whereIn('ratear', ['Sim', 'Não'])

			const arr = lodash.union(query, queryBaixados)

			for (const key in arr) {
				if (Object.hasOwnProperty.call(arr, key)) {
					const element = arr[key]
					element.valorRateio = 0.0
					element.valorTaxaAdm = 0.0
					element.valorBeneficios = 0.0
					element.valorTotal = 0.0
					element.rateio_id = null

					let ID =
						element.idPrincipal === 0 ? element.id : element.idPrincipal
					const rateio = await Database.from('rateio_equipamentos')
						.where('equipamento_id_principal', ID)
						.orderBy('rateio_id', 'desc')
						.first()
					if (rateio) {
						element.valorRateio = rateio.valorRateio
						element.valorTaxaAdm = rateio.valorTaxaAdm
						element.valorBeneficios = rateio.valorBeneficios
						element.valorTotal = rateio.valorTotal
						element.rateio_id = rateio.rateio_id
					} else {
						const rateio = await Database.from('rateio_equipamentos')
							.where('equipamento_id', ID)
							.orderBy('rateio_id', 'desc')
							.first()
						if (rateio) {
							element.valorRateio = rateio.valorRateio
							element.valorTaxaAdm = rateio.valorTaxaAdm
							element.valorBeneficios = rateio.valorBeneficios
							element.valorTotal = rateio.valorTotal
							element.rateio_id = rateio.rateio_id
						}
					}
				}
			}

			arr.forEach(e => {
				e.valorCobrar = e.valorTotal
				if (e.status === 'Inativo') {
					if (e.dEndosso) {
						let cData = moment(e.dEndosso).format('YYYY-MM-DD')

						let dia = parseInt(cData.substr(8, 2))
						if (dia <= 15) {
							if (e.valorTotal > 0) {
								e.valorCobrar = e.valorTotal * 0.5
							}
						}
					}
				}
			})

			return { success: true, data: arr }
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async endossoBaixarTodosEquipamentos(payload, auth) {
		let trx = null
		let nrErro = 0
		// Modulo de baixa de todos os euipamentos de um associado. Cancelamento
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			let dEndosso = payload.dEndosso
			if (!dEndosso) {
				dEndosso = moment().format('YYYY-MM-DD')
			}

			const endosso_id = new Date().getTime()

			let arrAddControle = []

			let motivoEndosso = ''
			let motivoStatus = ''
			let tipoEndosso = ''

			if (payload.lancamento) {
				motivoStatus = lodash.isEmpty(payload.motivo)
					? 'Endosso de Baixa Total dos Equipamentos'
					: payload.motivo

				motivoEndosso = lodash.isEmpty(payload.motivo)
					? 'Endosso de Baixa Total dos Equipamentos'
					: payload.motivo

				tipoEndosso = payload.lancamento
					? 'Endosso de Baixa Total dos Equipamentos'
					: 'Endosso de Inativação Total dos Equipamentos'
			} else {
				motivoStatus = lodash.isEmpty(payload.motivo)
					? 'Endosso de Inativação Total Equipamentos'
					: payload.motivo

				motivoEndosso = lodash.isEmpty(payload.motivo)
					? 'Endosso de Baixa Total dos Equipamentos'
					: payload.motivo

				tipoEndosso = payload.lancamento
					? 'Endosso de Baixa Total dos Equipamentos'
					: 'Endosso de Inativação Total Equipamentos'
			}

			// Endosso - EndossoItem
			const endossoAdd = await ModelEquipamentoEndosso.create(
				{
					pessoa_id: payload.pessoa_id,
					tipo: payload.lancamento
						? 'Baixa de Equipamento'
						: 'Inativação de Equipamento',
					sai_id: null,
					status: 'Ativo',
				},
				trx ? trx : null
			)

			for (const key in payload.equipamentos) {
				if (Object.hasOwnProperty.call(payload.equipamentos, key)) {
					const element = payload.equipamentos[key]

					const equipa = await Model.findOrFail(element.id)
					await equipa.load('pessoa')
					await equipa.load('equipamentoBeneficios.beneficio')
					await equipa.load('equipamentoRestricaos')
					await equipa.load('equipamentoProtecoes')

					let equipaJson = equipa.toJSON()
					let updated_at = moment(
						equipaJson.updated_at,
						'YYYY-MM-DD hh:mm:ss'
					).toJSON()

					if (element.updated_at !== updated_at) {
						throw {
							success: false,
							message: 'Equipamento alterado outro usuário.',
						}
					}

					let oEquipamento = {}
					oEquipamento.tipoEndosso = tipoEndosso
					oEquipamento.dEndosso = dEndosso
					oEquipamento.baixa = 'Não'
					oEquipamento.ratear = 'Não'
					oEquipamento.endosso_id = endosso_id
					oEquipamento.status = 'Inativo'

					equipa.merge(oEquipamento)

					// Log
					await this.addLog(equipa, auth, trx)

					await equipa.save(trx ? trx : null)

					// status equipamento
					let motivo = motivoStatus
					motivo = motivo + `(${moment(dEndosso).format('DD/MM/YYYY')})`
					let status = {
						equipamento_id: equipa.id,
						user_id: auth.user.id,
						motivo: motivo,
						status: equipa.status,
					}
					await EquipamentoStatus.create(status, trx ? trx : null)

					// Controle - Retirada de Benefícios
					for (const key in equipaJson.equipamentoBeneficios) {
						if (
							Object.hasOwnProperty.call(
								equipaJson.equipamentoBeneficios,
								key
							)
						) {
							const e = equipaJson.equipamentoBeneficios[key]

							let motivoControle = payload.lancamento
								? 'Baixa Equipamento'
								: 'Inativação Equipamento'

							arrAddControle.push({
								descricao: e.beneficio.descricao,
								motivo: motivoControle,
								acao: 'REMOÇÃO',
								tipo: 'BENEFICIO',
								obs: '',
								status: 'PENDENTE',
								pessoa_id: e.pessoa_id,
								equipamento_id: e.equipamento_id,
								equipamento_protecao_id: null,
								equipamento_beneficio_id: e.id,
								user_id: auth.user.id,
							})
						}
					}

					// Controle - Retirada de Proteçoes
					for (const key in equipaJson.equipamentoProtecoes) {
						if (
							Object.hasOwnProperty.call(
								equipaJson.equipamentoProtecoes,
								key
							)
						) {
							const e = equipaJson.equipamentoProtecoes[key]

							let motivoControle = payload.lancamento
								? 'Baixa Equipamento'
								: 'Inativação Equipamento'

							arrAddControle.push({
								descricao: e.tipo,
								motivo: motivoControle,
								acao: 'REMOÇÃO',
								tipo: e.tipo.toUpperCase(),
								obs: '',
								status: 'PENDENTE',
								pessoa_id: e.pessoa_id,
								equipamento_id: e.equipamento_id,
								equipamento_protecao_id: e.id,
								equipamento_beneficio_id: null,
								user_id: auth.user.id,
							})
						}
					}

					// Endosso - EndossoItem
					const endossoAddItem = await ModelEquipamentoEndossoItem.create(
						{
							equipa_endosso_id: endossoAdd.id,
							equipamento_id: equipaJson.id,
						},
						trx ? trx : null
					)
				}
			}

			// Lançamento de Financeiro
			let modelLancamento = null
			if (payload.lancamento) {
				let planoContaID = await new ServiceConfig().getPlanoContaObject(
					'receber-baixa'
				)
				if (!planoContaID) {
					nrErro = -100
					throw {
						success: false,
						message:
							'Transação abortada! Arquivo de configuração (lançamento de baixa) não localizado.',
					}
				}

				const oReceber = {
					tipo: 'Receita',
					endosso_id: endosso_id,
					parcelaI: 1,
					parcelaF: 1,
					equipamento_id: null,
					dVencimento: payload.lancamento.dVencimento,
					dCompetencia: dEndosso,
					valorBase: payload.lancamento.valorReceber,
					valorTotal: payload.lancamento.valorReceber,
					pessoa_id: payload.pessoa_id,
					historico: planoContaID.descricao,
					forma: payload.lancamento.forma,
					creditoRateio: 'Sim',
					isBaixa: true,
					//baixado: 'Sim',
					situacao: 'Aberto',
					status: 'Aberto',
					conta_id: payload.lancamento.conta_id,
					items: [
						{
							DC: 'C',
							tag: 'LF',
							descricao: planoContaID.descricao,
							planoDeConta_id: planoContaID.id,
							valor: payload.lancamento.valorReceber,
						},
					],
				}

				modelLancamento = await new LancamentoService().add(
					oReceber,
					trx,
					auth,
					false, //lancamento.forma === 'boleto', // isJobs
					false // isCommit
				)
			}

			// Gerar Controle
			await this.addControle(arrAddControle, trx)

			await trx.commit()

			let ret = {}

			if (payload.lancamento) {
				ret.lancamento_id = modelLancamento.id
			}

			return { success: true, data: ret }
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async endosso(data, trx, auth) {
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			let lancamento = null

			if (lodash.has(data, 'lancamento')) {
				lancamento = data.lancamento
			}

			const endosso_id = new Date().getTime()

			let equipamentoAdd = null

			if (data.placa1) {
				data.placa1 = data.placa1.replace('-', '')
			}
			if (data.placa2) {
				data.placa2 = data.placa2.replace('-', '')
			}
			if (data.placa3) {
				data.placa3 = data.placa3.replace('-', '')
			}

			const id = data.endosso.id
			const tipo_endosso = data.endosso.tipo_endosso
			let dEndosso = data.dEndosso
			if (!dEndosso) {
				dEndosso = moment().format('YYYY-MM-DD')
			}

			let equipamento = await Model.findOrFail(id)
			await equipamento.load('equipamentoProtecoes')
			//await equipamento.load('equipamentoSigns.signs')
			await equipamento.load('equipamentoBeneficios.beneficio')
			await equipamento.load('pessoa')
			await equipamento.load('equipamentoRestricaos')
			await equipamento.load('categoria')

			if (equipamento.status !== 'Ativo') {
				if (
					lodash.isEmpty(equipamento.idParent) &&
					equipamento.status === 'Inativo'
				) {
					// permitir endosso de reativação (tornar ativo).
				} else {
					throw { message: 'Status não permitido.', type: false }
				}
			}

			let oEquipamento = {}
			oEquipamento.status = 'Endossado'
			oEquipamento.idPrincipal = equipamento.idPrincipal
			if (!oEquipamento.idPrincipal) {
				oEquipamento.idPrincipal = equipamento.id
			}
			oEquipamento.idFilho = ''

			/*if (dEndosso) {
            oEquipamento.dEndosso = dEndosso
         }*/

			if (tipo_endosso === 'categoria-rateio') {
				const categoria = await ModelCategoria.findOrFail(data.categoria_id)

				const categoria_tipo = categoria.tipo

				equipamento.merge({
					valorMercado1: data.valorMercado,
					tipoEndosso: 'Alteração de categoria de rateio',
					categoria_id: data.categoria_id,
				})

				// Log
				await this.addLog(equipamento, auth, trx)

				equipamento.save(trx ? trx : null)

				// status equipamento
				let status = {
					equipamento_id: equipamento.id,
					user_id: auth.user.id,
					motivo: 'Endosso de alteração de categoria de rateio',
					status: equipamento.status,
				}
				await EquipamentoStatus.create(status, trx ? trx : null)
			}

			if (tipo_endosso === 'acerto-adesao') {
				equipamento.merge({
					dAdesao: data.dAdesao,
					tipoEndosso: 'Acerto na data de adesão',
				})

				// Log
				await this.addLog(equipamento, auth, trx)

				equipamento.save(trx ? trx : null)

				// status equipamento
				let status = {
					equipamento_id: equipamento.id,
					user_id: auth.user.id,
					motivo: 'Endosso de acerto na data de adesão',
					status: equipamento.status,
				}
				await EquipamentoStatus.create(status, trx ? trx : null)
			}

			// Acerto de equipamento
			if (tipo_endosso === 'acerto-equipamento') {
				if (await this.isDuplicidadePlaca(equipamento.id, data.placa1)) {
					throw { message: 'Placa em duplicidade.', code: '666' }
				}

				const equipamentoJSON = equipamento.toJSON()

				let dataUpdate = lodash.cloneDeep(data)

				const addRestricoes = data.equipamentoRestricaos

				delete dataUpdate['beneficios']
				delete dataUpdate['endosso']
				delete dataUpdate['equipamentoRestricaos']
				delete dataUpdate['equipamentoSigns']
				delete dataUpdate['logs']
				delete dataUpdate['protecoes']
				delete dataUpdate['created_at']

				data.placas = gerarPlacas(dataUpdate)
				data.tipoEndosso = 'Acerto nos dados do equipamento'
				equipamento.merge(dataUpdate)

				await ModelEquipamentoRestricao.query()
					.where('equipamento_id', equipamento.id)
					.transacting(trx ? trx : null)
					.delete()

				if (addRestricoes) {
					await equipamento
						.equipamentoRestricaos()
						.createMany(addRestricoes, trx ? trx : null)
				}

				// Log
				await this.addLog(equipamento, auth, trx)

				equipamento.save(trx ? trx : null)

				// status equipamento
				let status = {
					equipamento_id: equipamento.id,
					user_id: auth.user.id,
					motivo: 'Endosso de acerto nos dados do equipamento',
					status: equipamento.status,
				}
				await EquipamentoStatus.create(status, trx ? trx : null)
			}

			// Valor de Mercado
			if (tipo_endosso === 'acerto-valorMercado') {
				equipamento.merge({
					valorMercado1: data.valorMercado,
					tipoEndosso: 'Alteração do Valor de Mercado',
				})

				// Log
				await this.addLog(equipamento, auth, trx)

				equipamento.save(trx ? trx : null)

				// status equipamento
				let status = {
					equipamento_id: equipamento.id,
					user_id: auth.user.id,
					motivo: 'Endosso de alteração do Valor de Mercado',
					status: equipamento.status,
				}
				await EquipamentoStatus.create(status, trx ? trx : null)
			}
			// Fim Valor de Mercado

			// Baixa (inativação)
			if (tipo_endosso === 'baixa') {
				let equipamentoJSON = equipamento.toJSON()

				let oEquipamento = {}
				oEquipamento.tipoEndosso = 'Baixa de Equipamento'
				oEquipamento.dEndosso = dEndosso
				oEquipamento.baixa = 'Sim'
				oEquipamento.endosso_id = endosso_id
				oEquipamento.status = 'Inativo'

				if (lancamento) {
					oEquipamento.ratear = 'Não'
				} else {
					oEquipamento.ratear = 'Sim'
				}

				equipamento.merge(oEquipamento)

				// Log
				await this.addLog(equipamento, auth, trx)

				equipamento.save(trx ? trx : null)

				let arrAddControle = []

				// status equipamento
				let motivo = lodash.isEmpty(data.motivo)
					? 'Endosso de Baixa de Equipamento'
					: data.motivo
				motivo = motivo + `(${moment(dEndosso).format('DD/MM/YYYY')})`
				let status = {
					equipamento_id: equipamento.id,
					user_id: auth.user.id,
					motivo: motivo,
					status: equipamento.status,
				}
				await EquipamentoStatus.create(status, trx ? trx : null)

				// Lançamento de Financeiro
				if (lancamento) {
					let planoContaID = await new ServiceConfig().getPlanoContaObject(
						'receber-baixa'
					)
					if (!planoContaID) {
						nrErro = -100
						throw {
							success: false,
							message:
								'Transação abortada! Arquivo de configuração (lançamento de baixa) não localizado.',
						}
					}

					const oReceber = {
						tipo: 'Receita',
						parcelaI: 1,
						parcelaF: 1,
						equipamento_id: equipamento.id,
						dVencimento: lancamento.dVencimento,
						dCompetencia: dEndosso,
						valorBase: lancamento.valorReceber,
						valorTotal: lancamento.valorReceber,
						pessoa_id: equipamento.pessoa_id,
						historico: planoContaID.descricao + ' ' + equipamento.placa1,
						forma: lancamento.forma,
						creditoRateio: 'Sim',
						isBaixa: true,
						//baixado: 'Sim',
						situacao: 'Aberto',
						status: 'Aberto',
						conta_id: lancamento.conta_id,
						endosso_id,
						items: [
							{
								DC: 'C',
								tag: 'LF',
								descricao: planoContaID.descricao,
								planoDeConta_id: planoContaID.id,
								valor: lancamento.valorReceber,
							},
						],
					}

					const modelLancamento = await new LancamentoService().add(
						oReceber,
						trx,
						auth,
						false, //lancamento.forma === 'boleto', // isJobs
						false // isCommit
					)

					equipamento.lancamento_id = modelLancamento.id
				}

				// Controle - Retirada de Benefícios
				for (const key in equipamentoJSON.equipamentoBeneficios) {
					if (
						Object.hasOwnProperty.call(
							equipamentoJSON.equipamentoBeneficios,
							key
						)
					) {
						const e = equipamentoJSON.equipamentoBeneficios[key]

						arrAddControle.push({
							descricao: e.beneficio.descricao,
							motivo: 'Baixa Equipamento',
							acao: 'REMOÇÃO',
							tipo: 'BENEFICIO',
							obs: '',
							status: 'PENDENTE',
							pessoa_id: equipamento.pessoa_id,
							equipamento_id: e.equipamento_id,
							equipamento_protecao_id: null,
							equipamento_beneficio_id: e.id,
							user_id: auth.user.id,
						})
					}
				}

				// Controle - Retirada de Proteçoes
				for (const key in equipamentoJSON.equipamentoProtecoes) {
					if (
						Object.hasOwnProperty.call(
							equipamentoJSON.equipamentoProtecoes,
							key
						)
					) {
						const e = equipamentoJSON.equipamentoProtecoes[key]

						arrAddControle.push({
							descricao: e.tipo,
							motivo: 'Baixa Equipamento',
							acao: 'REMOÇÃO',
							tipo: e.tipo.toUpperCase(),
							obs: '',
							status: 'PENDENTE',
							pessoa_id: equipamento.pessoa_id,
							equipamento_id: e.equipamento_id,
							equipamento_protecao_id: e.id,
							equipamento_beneficio_id: null,
							user_id: auth.user.id,
						})
					}
				}

				// Endosso - EndossoItem
				const endossoAdd = await ModelEquipamentoEndosso.create(
					{
						pessoa_id: equipamentoJSON.pessoa_id,
						tipo: 'Baixa de Equipamento',
						sai_id: null,
						status: 'Ativo',
						saiJson: null,
						equipaJson: JSON.stringify([equipamentoJSON]), //JSON.stringify([equipamentoAdd]),
					},
					trx ? trx : null
				)
				const endossoAddItem = await ModelEquipamentoEndossoItem.create(
					{
						equipa_endosso_id: endossoAdd.id,
						equipamento_id: equipamentoJSON.id,
					},
					trx ? trx : null
				)

				// Gerar Controle
				await this.addControle(arrAddControle, trx)
			}
			// fim - baixa

			// Cancelamento (inativação)
			if (tipo_endosso === 'cancelamento') {
				let equipamentoJSON = equipamento.toJSON()

				let oEquipamento = {}
				oEquipamento.tipoEndosso = 'Cancelamento do Equipamento'
				oEquipamento.dEndosso = dEndosso
				oEquipamento.baixa = 'Não'
				oEquipamento.ratear = 'Não'
				oEquipamento.endosso_id = endosso_id
				oEquipamento.status = 'Inativo'

				equipamento.merge(oEquipamento)

				// Log
				await this.addLog(equipamento, auth, trx)

				equipamento.save(trx ? trx : null)

				let arrAddControle = []

				// status equipamento
				let motivo = lodash.isEmpty(data.motivo)
					? 'Endosso de Inativação de Equipamento'
					: data.motivo
				motivo = motivo + `(${moment(dEndosso).format('DD/MM/YYYY')})`
				let status = {
					equipamento_id: equipamento.id,
					user_id: auth.user.id,
					motivo: motivo,
					status: equipamento.status,
				}
				await EquipamentoStatus.create(status, trx ? trx : null)

				// Controle - Retirada de Benefícios
				for (const key in equipamentoJSON.equipamentoBeneficios) {
					if (
						Object.hasOwnProperty.call(
							equipamentoJSON.equipamentoBeneficios,
							key
						)
					) {
						const e = equipamentoJSON.equipamentoBeneficios[key]

						arrAddControle.push({
							descricao: e.beneficio.descricao,
							motivo: 'Inativação Equipamento',
							acao: 'REMOÇÃO',
							tipo: 'BENEFICIO',
							obs: '',
							status: 'PENDENTE',
							pessoa_id: e.pessoa_id,
							equipamento_id: e.equipamento_id,
							equipamento_protecao_id: null,
							equipamento_beneficio_id: e.id,
							user_id: auth.user.id,
						})
					}
				}

				// Controle - Retirada de Proteçoes
				for (const key in equipamentoJSON.equipamentoProtecoes) {
					if (
						Object.hasOwnProperty.call(
							equipamentoJSON.equipamentoProtecoes,
							key
						)
					) {
						const e = equipamentoJSON.equipamentoProtecoes[key]

						arrAddControle.push({
							descricao: e.tipo,
							motivo: 'Inativação Equipamento',
							acao: 'REMOÇÃO',
							tipo: e.tipo.toUpperCase(),
							obs: '',
							status: 'PENDENTE',
							pessoa_id: e.pessoa_id,
							equipamento_id: e.equipamento_id,
							equipamento_protecao_id: e.id,
							equipamento_beneficio_id: null,
							user_id: auth.user.id,
						})
					}
				}

				// Endosso - EndossoItem
				const endossoAdd = await ModelEquipamentoEndosso.create(
					{
						pessoa_id: equipamentoJSON.pessoa_id,
						tipo: 'Baixa de Equipamento',
						sai_id: equipamento.id,
						status: 'Ativo',
					},
					trx ? trx : null
				)
				const endossoAddItem = await ModelEquipamentoEndossoItem.create(
					{
						equipa_endosso_id: endossoAdd.id,
						equipamento_id: equipamentoJSON.id,
					},
					trx ? trx : null
				)

				// Gerar Controle
				await this.addControle(arrAddControle, trx)
			}
			// Cancelamento (inativação)

			// Reativar (tornar ativo)
			if (tipo_endosso === 'reativacao') {
				let equipamentoJSON = equipamento.toJSON()

				let oEquipamento = {}
				oEquipamento.tipoEndosso = 'Reativação do Equipamento'
				oEquipamento.dEndosso = dEndosso
				oEquipamento.baixa = 'Não'
				oEquipamento.ratear = 'Não'
				oEquipamento.endosso_id = endosso_id
				oEquipamento.status = 'Ativo'

				equipamento.merge(oEquipamento)

				// Log
				await this.addLog(equipamento, auth, trx)

				equipamento.save(trx ? trx : null)

				let arrAddControle = []

				// status equipamento
				let motivo = lodash.isEmpty(data.motivo)
					? 'Endosso de Reativação de Equipamento'
					: data.motivo
				motivo = motivo + `(${moment(dEndosso).format('DD/MM/YYYY')})`
				let status = {
					equipamento_id: equipamento.id,
					user_id: auth.user.id,
					motivo: motivo,
					status: equipamento.status,
				}
				await EquipamentoStatus.create(status, trx ? trx : null)

				// Controle - Retirada de Benefícios
				for (const key in equipamentoJSON.equipamentoBeneficios) {
					if (
						Object.hasOwnProperty.call(
							equipamentoJSON.equipamentoBeneficios,
							key
						)
					) {
						const e = equipamentoJSON.equipamentoBeneficios[key]

						arrAddControle.push({
							descricao: e.beneficio.descricao,
							motivo: 'Reativação Equipamento',
							acao: 'INCLUSÃO',
							tipo: 'BENEFICIO',
							obs: '',
							status: 'PENDENTE',
							pessoa_id: equipamento.pessoa_id,
							equipamento_id: e.equipamento_id,
							equipamento_protecao_id: null,
							equipamento_beneficio_id: e.id,
							user_id: auth.user.id,
						})
					}
				}

				// Controle - Retirada de Proteçoes
				for (const key in equipamentoJSON.equipamentoProtecoes) {
					if (
						Object.hasOwnProperty.call(
							equipamentoJSON.equipamentoProtecoes,
							key
						)
					) {
						const e = equipamentoJSON.equipamentoProtecoes[key]

						arrAddControle.push({
							descricao: e.tipo,
							motivo: 'Reativação Equipamento',
							acao: 'INCLUSÃO',
							tipo: e.tipo.toUpperCase(),
							obs: '',
							status: 'PENDENTE',
							pessoa_id: equipamento.pessoa_id,
							equipamento_id: e.equipamento_id,
							equipamento_protecao_id: e.id,
							equipamento_beneficio_id: null,
							user_id: auth.user.id,
						})
					}
				}

				// Endosso - EndossoItem
				const endossoAdd = await ModelEquipamentoEndosso.create(
					{
						pessoa_id: equipamentoJSON.pessoa_id,
						tipo: 'Reativação de Equipamento',
						sai_id: null,
						status: 'Ativo',
					},
					trx ? trx : null
				)
				const endossoAddItem = await ModelEquipamentoEndossoItem.create(
					{
						equipa_endosso_id: endossoAdd.id,
						equipamento_id: equipamentoJSON.id,
					},
					trx ? trx : null
				)

				// Gerar Controle
				await this.addControle(arrAddControle, trx)
			}
			// Fim reativação

			// substituição de equipamento
			if (tipo_endosso === 'substituicao-equipamento') {
				if (await this.isDuplicidadePlaca(equipamento.id, data.placa1)) {
					throw { message: 'Placa em duplicidade.', code: '666' }
				}

				const equipamentoSai = equipamento.toJSON()

				let novoEquipamento = equipamento.toJSON()
				let pessoaSign = lodash.cloneDeep(novoEquipamento.pessoa)
				delete novoEquipamento['pessoa']
				let jsonSubstituicao = {
					pessoa: pessoaSign,
					sai: lodash.cloneDeep(novoEquipamento),
				}

				let arrAddControle = []

				// Controle - Retirada de Benefícios
				for (const key in novoEquipamento.equipamentoBeneficios) {
					if (
						Object.hasOwnProperty.call(
							novoEquipamento.equipamentoBeneficios,
							key
						)
					) {
						const e = novoEquipamento.equipamentoBeneficios[key]

						arrAddControle.push({
							descricao: e.beneficio.descricao,
							motivo: 'Equipamento Substituido',
							acao: 'REMOÇÃO',
							tipo: 'BENEFICIO',
							obs: '',
							status: 'PENDENTE',
							pessoa_id: equipamentoSai.pessoa_id,
							equipamento_id: e.equipamento_id,
							equipamento_protecao_id: null,
							equipamento_beneficio_id: e.id,
							user_id: auth.user.id,
						})
					}
				}

				// Controle - Retirada de Proteçoes
				for (const key in novoEquipamento.equipamentoProtecoes) {
					if (
						Object.hasOwnProperty.call(
							novoEquipamento.equipamentoProtecoes,
							key
						)
					) {
						const e = novoEquipamento.equipamentoProtecoes[key]

						arrAddControle.push({
							descricao: e.tipo,
							motivo: 'Equipamento Substituido',
							acao: 'REMOÇÃO',
							tipo: e.tipo.toUpperCase(),
							obs: '',
							status: 'PENDENTE',
							pessoa_id: equipamentoSai.pessoa_id,
							equipamento_id: e.equipamento_id,
							equipamento_protecao_id: e.id,
							equipamento_beneficio_id: null,
							user_id: auth.user.id,
						})
					}
				}

				let addRestricoes = []
				let arrRestricoes = data.equipamentoRestricaos
					? data.equipamentoRestricaos
					: []

				// Restriçoes
				for (const key in arrRestricoes) {
					if (Object.hasOwnProperty.call(arrRestricoes, key)) {
						const r = arrRestricoes[key]
						addRestricoes.push(r)
					}
				}

				delete novoEquipamento['id']
				delete novoEquipamento['equipamentoBeneficios']
				delete novoEquipamento['equipamentoProtecoes']
				delete novoEquipamento['pessoa']
				delete novoEquipamento['equipamentoRestricaos']
				delete novoEquipamento['categoria']
				novoEquipamento.idPai = equipamento.id
				novoEquipamento.idFilho = null
				novoEquipamento.idPrincipal = oEquipamento.idPrincipal
				novoEquipamento.status = 'Ativo'

				novoEquipamento.categoria_id = data.categoria_id

				novoEquipamento.tipoEndosso = 'Substituição de equipamento'

				novoEquipamento.dEndosso = dEndosso
				novoEquipamento.endosso_id = endosso_id

				novoEquipamento.especie1 = data.especie1
				novoEquipamento.valorMercado1 = data.valorMercado1
				novoEquipamento.marca1 = data.marca1
				novoEquipamento.modelo1 = data.modelo1
				novoEquipamento.anoF1 = data.anoF1
				novoEquipamento.modeloF1 = data.modeloF1
				novoEquipamento.placa1 = data.placa1
				novoEquipamento.chassi1 = data.chassi1
				novoEquipamento.renavam1 = data.renavam1

				novoEquipamento.especie2 = data.especie2
				novoEquipamento.marca2 = data.marca2
				novoEquipamento.modelo2 = data.modeloF2
				novoEquipamento.anoF2 = data.anoF2
				novoEquipamento.modeloF2 = data.modeloF2
				novoEquipamento.placa2 = data.placa2
				novoEquipamento.chassi2 = data.chassi2
				novoEquipamento.renavam2 = data.renavam2

				novoEquipamento.especie3 = data.especie3
				novoEquipamento.marca3 = data.marca3
				novoEquipamento.modelo3 = data.modeloF3
				novoEquipamento.anoF3 = data.anoF3
				novoEquipamento.modeloF3 = data.modeloF3
				novoEquipamento.placa3 = data.placa3
				novoEquipamento.chassi3 = data.chassi3
				novoEquipamento.renavam3 = data.renavam3

				novoEquipamento.placas = gerarPlacas(data)

				// Adincionar novo equipamento (endosso)
				equipamentoAdd = await Model.create(
					novoEquipamento,
					trx ? trx : null
				)
				// Log para novo equipamento
				await ModelEquipamentoLog.createMany(
					[
						{
							field: 'Tipo Endosso',
							valueOld: '',
							valueNew: equipamentoAdd.tipoEndosso,
							equipamento_id: equipamentoAdd['id'],
							user_id: auth.user.id,
							isVisible: true,
						},
					],
					trx ? trx : null
				)

				oEquipamento.idFilho = equipamentoAdd.id

				equipamento.merge(oEquipamento)
				//novoEquipamento.id = equipamento.id

				// Log
				await this.addLog(equipamento, auth, trx)

				equipamento.save(trx ? trx : null)

				if (addRestricoes.length > 0) {
					await equipamento
						.equipamentoRestricaos()
						.createMany(addRestricoes, trx ? trx : null)
				}

				// status equipamento
				let status = {
					equipamento_id: equipamento.id,
					user_id: auth.user.id,
					motivo: 'Endosso de substituição de equipamento',
					status: 'Endossado',
				}
				await EquipamentoStatus.create(status, trx ? trx : null)

				// status novo equipamento (endosso)
				status = {
					equipamento_id: equipamentoAdd.id,
					user_id: auth.user.id,
					motivo: 'Endosso de substituição de equipamento',
					status: 'Ativo',
				}
				await EquipamentoStatus.create(status, trx ? trx : null)

				jsonSubstituicao.entra = equipamentoAdd.toJSON()

				// Restriçoes para substuição (ENTRA)
				if (addRestricoes.length > 0) {
					jsonSubstituicao.entra.equipamentoRestricaos = addRestricoes
				}

				// Beneficios - copiar para o atual
				const beneficios = data.beneficios
				if (beneficios) {
					jsonSubstituicao.entra.equipamentoBeneficios = []
					for (let i in beneficios) {
						let r = beneficios[i]
						let registro = {
							dInicio: new Date(),
							equipamento_id: equipamentoAdd.id,
							beneficio_id: r.beneficio_id,
							status: r.status,
							obs: r.obs,
						}
						//r.equipamento_id= novoEquipamento.equipamento_id
						const resEquipamentoBeneficio =
							await new EquipamentoBeneficioService().add(
								registro,
								trx,
								auth,
								novoEquipamento,
								false // Não adicionar / desabilitar add controle dentro do metodo add
							)
						const modelBeneficio = await Beneficio.findOrFail(
							r.beneficio_id
						)
						arrAddControle.push({
							descricao: modelBeneficio.descricao,
							motivo: 'Substituição de Equipamento',
							acao: 'INCLUSÃO',
							tipo: 'BENEFICIO',
							obs: '',
							status: 'PENDENTE',
							pessoa_id: equipamentoAdd.pessoa_id,
							equipamento_id: equipamentoAdd.id,
							equipamento_protecao_id: null,
							equipamento_beneficio_id: resEquipamentoBeneficio.id,
							user_id: auth.user.id,
						})

						const resEquipamentoBeneficioJSON =
							resEquipamentoBeneficio.toJSON()
						resEquipamentoBeneficioJSON.beneficio =
							modelBeneficio.toJSON()

						jsonSubstituicao.entra.equipamentoBeneficios.push(
							resEquipamentoBeneficioJSON
						)
					}
				}

				// Gerar Controle
				await this.addControle(arrAddControle, trx)

				if (lodash.has(data, 'protecoes')) {
					// Transferir beneficios para o equipamento atual (endosso)
					/*await EquipamentoProtecao
            .query()
            .where('equipamento_id', equipamento.id)
            .transacting(trx ? trx : null)
            .update({ equipamento_id: equipamentoAdd.id })*/
					jsonSubstituicao.entra.equipamentoProtecoes = []

					const protecaoServ = await new EquipamentoProtecaoService().add(
						{
							equipamento: equipamentoAdd,
							controle: {
								motivo: 'Substituição de Equipamento',
								acao: 'INCLUSÃO',
							},
						},
						data.protecoes,
						trx,
						auth
					)

					jsonSubstituicao.entra.equipamentoProtecoes = protecaoServ
				}

				// Endosso - EndossoItem
				const endossoAdd = await ModelEquipamentoEndosso.create(
					{
						pessoa_id: equipamentoAdd.pessoa_id,
						tipo: equipamentoAdd.tipoEndosso,
						sai_id: equipamento.id,
						status: 'Ativo',
						saiJson: JSON.stringify(equipamentoSai),
						equipaJson: JSON.stringify([jsonSubstituicao.entra]), //JSON.stringify([equipamentoAdd]),
					},
					trx ? trx : null
				)
				const endossoAddItem = await ModelEquipamentoEndossoItem.create(
					{
						equipa_endosso_id: endossoAdd.id,
						equipamento_id: equipamentoAdd.id,
					},
					trx ? trx : null
				)

				// Adicionar sign
				const oSign = {
					signatarioNome: pessoaSign.signatarioNome,
					signatarioCPF: pessoaSign.signatarioCPF,
					dispositivo: pessoaSign.dispositivo,
					signatarioDNasc: pessoaSign.dNasc,
					signatarioEmail: pessoaSign.email,
					tipo: 'Requerimento de Substituição',
					dataDoc: null,
					assinatura: null,
					user_id: auth.user.id,
					status: 'Iniciado',
					dataJson: JSON.stringify([jsonSubstituicao]),
				}
				await ModelSign.create(oSign, trx)
			}

			// Ocorrencia  - Alterar ID do equipamento da ocorrencia para os equipamentos endossados - exceto para substituição de equipamento.
			/*if (tipo_endosso !== 'substituicao-equipamento') {
				await ModelOcorrencia.query()
					.where('equipamento_id', equipamento.id)
					.transacting(trx ? trx : null)
					.update({ equipamento_id: equipamentoAdd.id })

				// Transferir beneficios para o equipamento atual (endosso)
				await EquipamentoProtecao.query()
					.where('equipamento_id', equipamento.id)
					.transacting(trx ? trx : null)
					.update({ equipamento_id: equipamentoAdd.id })

				// Transferir Proteção (bloequeador e Localizador) para o equipamento atual (endosso)
				await EquipamentoBeneficio.query()
					.where('equipamento_id', equipamento.id)
					.transacting(trx ? trx : null)
					.update({ equipamento_id: equipamentoAdd.id })

				// Transferir restriçoes para o equipamento atual (endosso)
				await ModelEquipamentoRestricao.query()
					.where('equipamento_id', equipamento.id)
					.transacting(trx ? trx : null)
					.update({ equipamento_id: equipamentoAdd.id })
			}

			// Tratar galeria - transferir galeria para o registro atual
			if (tipo_endosso !== 'substituicao-equipamento') {
				const affectedRows = await Database.table('files')
					.whereIn('modulo', [
						'Equipamento',
						'Equipamento|requerimento-adesao',
					])
					.andWhere('idParent', equipamento.id)
					.transacting(trx ? trx : null)
					.update({ idParent: equipamentoAdd.id })
			}*/

			//await trx.rollback()
			await trx.commit()

			if (tipo_endosso === 'substituicao-equipamento') {
				await equipamentoAdd.load('equipamentoProtecoes')
				await equipamentoAdd.load('equipamentoStatuses')
				await equipamentoAdd.load('pessoa')
				await equipamentoAdd.load('categoria')
				await equipamentoAdd.load('equipamentoBeneficios')
				await equipamentoAdd.load('ocorrencias')
				await equipamentoAdd.load('equipamentoRestricaos')
				await equipamentoAdd.load('logs')

				return equipamentoAdd
			} else {
				equipamento = await Model.findOrFail(id)
				await equipamento.load('equipamentoProtecoes')
				await equipamento.load('equipamentoStatuses')
				await equipamento.load('pessoa')
				await equipamento.load('categoria')
				await equipamento.load('equipamentoBeneficios')
				await equipamento.load('ocorrencias')
				await equipamento.load('equipamentoRestricaos')
				await equipamento.load('logs')

				return equipamento
			}
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async get(ID) {
		try {
			const equipamento = await Model.findOrFail(ID)

			await equipamento.load('equipamentoStatuses')
			await equipamento.load('pessoa')
			await equipamento.load('categoria')
			await equipamento.load('equipamentoProtecoes')
			await equipamento.load('equipamentoSigns.signs')
			//await equipamento.load('equipamentoBeneficios')
			await equipamento.load('equipamentoBeneficios.beneficio')
			await equipamento.load('equipamentoRestricaos')
			await equipamento.load('logs')

			//await equipamento.load('ocorrencias')

			return equipamento
		} catch (e) {
			throw e
		}
	}

	async getLog(equipamento_id) {
		try {
			const log = await ModelEquipamentoLog.query()
				.where('equipamento_id', equipamento_id)
				.with('user')
				.fetch()

			return log
		} catch (e) {
			throw e
		}
	}

	async getEndossoPorPessoaID(ID) {
		try {
			const query = await ModelEquipamentoEndosso.query()
				.where('pessoa_id', ID)
				.orderBy('id', 'desc')
				.with('pessoa', builder => {
					builder.select('id', 'nome')
				})

				.with('items')
				.with('items.equipamento.pessoa', builder => {
					builder.select('id', 'nome')
				})

				.with('items.equipamento', builder => {
					builder.select(
						'id',
						'categoria_id',
						'pessoa_id',
						'placa1',
						'marca1',
						'modelo1',
						'anoF1',
						'modeloF1',
						'placas'
					)
					builder.with('pessoa', builder => {
						builder.select('id', 'nome')
					})
					builder.with('categoria', builder => {
						builder.select('id', 'abreviado')
					})
					//builder.with('equipamentoBeneficios')
					//builder.with('equipamentoProtecoes')
				})

				.fetch()

			/*await equipamento.load('equipamentoStatuses')
         await equipamento.load('pessoa')
         await equipamento.load('categoria')
         await equipamento.load('equipamentoProtecoes')
         await equipamento.load('equipamentoBeneficios')*/

			//await equipamento.load('ocorrencias')

			return query
		} catch (e) {
			throw e
		}
	}

	async getEndossos(ID) {
		try {
			const query = await Model.query()
				.where('idPrincipal', ID)
				.orderBy('ID', 'desc')
				.with('pessoa')
				.with('categoria')
				.with('equipamentoProtecoes')
				.with('equipamentoBeneficios')
				.with('equipamentoStatuses')
				.with('equipamentoRestricaos', builder => {
					builder.with('restricao')
				})
				.with('equipamentoStatuses.user')
				.fetch()

			/*await equipamento.load('equipamentoStatuses')
         await equipamento.load('pessoa')
         await equipamento.load('categoria')
         await equipamento.load('equipamentoProtecoes')
         await equipamento.load('equipamentoBeneficios')*/

			//await equipamento.load('ocorrencias')

			return query
		} catch (e) {
			throw e
		}
	}

	async addLog(data, auth = null, trx = null) {
		try {
			const arr = Object.keys(data.dirty)
			for (const key in arr) {
				if (Object.hasOwnProperty.call(arr, key)) {
					const field = arr[key]
					let novo = data.$attributes[field]
					let original = data.$originalAttributes[field]

					let o = null

					switch (field) {
						case 'created_at':
							break
						case 'updated_at':
							if (
								moment(novo, 'YYYY-MM-DD hh:mm:ss').toJSON() !==
								moment(original, 'YYYY-MM-DD').toJSON()
							) {
								o = {
									field: 'updated_at',
									valueOld: moment(original).format(
										'DD/MM/YYYY hh:mm:ss'
									),
									valueNew: moment(novo, 'YYYY-MM-DD hh:mm:ss').format(
										'DD/MM/YYYY hh:mm:ss'
									),
									equipamento_id: data.$originalAttributes['id'],
									user_id: auth.user.id,
								}
							}
							break

						case 'status':
							if (novo !== original) {
								o = {
									field: 'status',
									valueOld: original,
									valueNew: novo,
									equipamento_id: data.$originalAttributes['id'],
									user_id: auth.user.id,
								}
							}
							break
						case 'categoria_id':
							if (parseInt(novo) !== parseInt(original)) {
								o = {
									field: 'Código Categoria',
									valueOld: original,
									valueNew: novo,
									equipamento_id: data.$originalAttributes['id'],
									user_id: auth.user.id,
								}
							}
							break
						case 'preCadastro_id':
							if (novo !== original) {
								o = {
									field: 'preCadastro_id',
									valueOld: original,
									valueNew: novo,
									equipamento_id: data.$originalAttributes['id'],
									user_id: auth.user.id,
								}
							}
							break

						case 'dAdesao':
							if (
								moment(novo, 'YYYY-MM-DD').format('YYYY-MM-DD') !==
								moment(original, 'YYYY-MM-DD').format('YYYY-MM-DD')
							) {
								o = {
									field: 'Adesão',
									valueOld: moment(original, 'YYYY-MM-DD').format(
										'DD/MM/YYYY'
									),
									valueNew: moment(novo, 'YYYY-MM-DD').format(
										'DD/MM/YYYY'
									),
									equipamento_id: data.$originalAttributes['id'],
									user_id: auth.user.id,
								}
							}
							break

						case 'dEndosso':
							if (
								moment(novo, 'YYYY-MM-DD').format('YYYY-MM-DD') !==
								moment(original, 'YYYY-MM-DD').format('YYYY-MM-DD')
							) {
								o = {
									field: 'Endosso',
									valueOld: moment(original, 'YYYY-MM-DD').format(
										'DD/MM/YYYY'
									),
									valueNew: moment(novo, 'YYYY-MM-DD').format(
										'DD/MM/YYYY'
									),
									equipamento_id: data.$originalAttributes['id'],
									user_id: auth.user.id,
								}
							}
							break

						default:
							let isVisible = true
							if (
								field === 'idPrincipal' ||
								field === 'idFilho' ||
								field === 'idPai'
							) {
								isVisible = false
							}

							if (field === 'valorMercado1') {
								novo = parseFloat(novo)
							}
							if (novo !== original) {
								o = {
									field: field,
									valueOld: original,
									valueNew: novo,
									equipamento_id: data.$originalAttributes['id'],
									user_id: auth.user.id,
									isVisible,
								}
							}
							break
					}

					if (o) {
						await ModelEquipamentoLog.create(o, trx ? trx : null)
					}

					o = null
				}
			}
		} catch (e) {
			throw e
		}
	}

	async addControle(arr, trx = null) {
		try {
			const controle = await ModelEquipamentoControle.createMany(arr, trx)

			return controle
		} catch (e) {
			throw e
		}
	}

	async updateControle(payload, auth) {
		try {
			const trx = await Database.beginTransaction()

			const controle = await ModelEquipamentoControle.findOrFail(
				payload.id,
				trx
			)

			let isStatus = false

			if (controle.status.toUpperCase() !== payload.status.toUpperCase()) {
				isStatus = true
			}

			const log = {
				field: 'status',
				valueOld: controle.status,
				valueNew: payload.status,
				equipamento_controle_id: controle.id,
				user_id: auth.user.id,
			}

			await ModelEquipamentoControleLog.create(log, trx ? trx : null)

			controle.merge(payload)
			await controle.save(trx)

			await trx.commit()

			return controle
		} catch (e) {
			throw e
		}
	}

	async index() {
		try {
			const equipamento = await Model.query().fetch()

			return equipamento
		} catch (e) {
			throw e
		}
	}

	/*async getAllRestricao() {
      try {
         const restricoes = await ModelRestricao.all()

         return restricoes
      } catch (e) {
         throw e
      }
   }*/

	async addStatus(data, trx, auth) {
		try {
			if (!trx) {
				trx = await Database.beginTransaction()
			}

			data.user_id = auth.user.id

			const equipamento = await Model.findOrFail(data.equipamento_id)
			equipamento.status = data.status
			equipamento.save(trx ? trx : null)

			const status = data
			await EquipamentoStatus.create(status, trx ? trx : null)

			await trx.commit()

			return equipamento
		} catch (e) {
			await trx.rollback()
			throw e
		}
	}

	async isDuplicidadePlaca(id, placa) {
		const query = await Model.query()
			.where('placa1', 'like', placa)
			.where('status', 'like', 'Ativo')
			.fetch()

		placa = placa.replace('-', '')

		let recno = query.rows.length

		if (recno === 0) {
			return false
		}

		if (!id) {
			return true
		}

		let isOk = true

		for (let i in query.rows) {
			if (query.rows[i].id === parseInt(id)) {
				isOk = false
			}
		}

		return isOk
	}

	async buscarProtecoes(payload) {
		try {
			let status = !payload.status ? null : payload.status.split(',')
			let isSemProcecao = !payload.isSemProcecao ? false : true

			let query = null

			if (isSemProcecao) {
				const query = await Model.query()
					.with('pessoa')
					.with('equipamentoProtecoes')
					.setHidden(['idPai'])
					.where('status', 'Ativo')
					.fetch()

				let arr = []

				for (let i in query.rows) {
					let e = query.rows[i]
					let pessoa = await e.pessoa().fetch()
					let o = {
						equipamento_id: e.id,
						nome: pessoa.nome,
						pessoa_status: pessoa.status,
						marca1: e.marca1,
						modelo1: e.modelo1,
						placa1: e.placa1,
						status: e.status,
						bloqueador: null,
						localizador: null,
					}
					let protecoes = await e.equipamentoProtecoes().fetch()

					protecoes.rows.forEach(x => {
						if (x.tipo === 'Localizador') {
							if (x.status === 'Removido' || x.status === 'Perdido') {
								o.localizador = null
							} else {
								o.localizador = x.status
							}
						}
						if (x.tipo === 'Bloqueador') {
							if (x.status === 'Removido' || x.status === 'Perdido') {
								o.bloqueador = null
							} else {
								o.bloqueador = x.status
							}
						}
						//if (x.tipo === 'Localizador')  x.status.includes('Removido', 'Perdido') ? o.localizador= null : o.localizador= x.status
						//if (x.tipo === 'Bloqueador')  x.status.includes('Removido', 'Perdido') ? o.bloqueador= null: o.bloqueador= x.status
					})

					if (o.bloqueador && o.localizador) {
					} else {
						arr.push(o)
					}
				}

				return arr
			}

			if (status) {
				query = await Database.select([
					'equipamentos.id as equipamento_id',
					'equipamentos.placa1',
					'equipamentos.placa2',
					'equipamentos.placa3',
					'equipamentos.status',
					'equipamentos.marca1',
					'equipamentos.modelo1',
					'equipamento_protecaos.id as protecao_id',
					'equipamento_protecaos.dAtivacao',
					'equipamento_protecaos.dRemocao',
					'equipamento_protecaos.tipo',
					'equipamento_protecaos.status as protecao_status',
					'nome',
					'pessoas.status as pessoa_status',
				])
					.from('equipamentos')
					.leftOuterJoin('pessoas', 'equipamentos.pessoa_id', 'pessoas.id') //.where('pessoas.modulo', 'Associado')
					.innerJoin(
						'equipamento_protecaos',
						'equipamentos.id',
						'equipamento_protecaos.equipamento_id'
					)
					.orderBy(['pessoas.nome', 'equipamento_protecaos.tipo'])
					.whereIn('equipamento_protecaos.status', status)
			} else {
				query = await Database.select([
					'equipamentos.id as equipamento_id',
					'equipamentos.placa1',
					'equipamentos.placa2',
					'equipamentos.placa3',
					'equipamentos.status',
					'equipamentos.marca1',
					'equipamentos.modelo1',
					'equipamento_protecaos.id as protecao_id',
					'equipamento_protecaos.dAtivacao',
					'equipamento_protecaos.dRemocao',
					'equipamento_protecaos.tipo',
					'equipamento_protecaos.status as protecao_status',
					'nome',
					'pessoas.status as pessoa_status',
				])
					.from('equipamentos')
					.leftOuterJoin('pessoas', 'equipamentos.pessoa_id', 'pessoas.id') //.where('pessoas.modulo', 'Associado')
					.innerJoin(
						'equipamento_protecaos',
						'equipamentos.id',
						'equipamento_protecaos.equipamento_id'
					)
					.orderBy(['pessoas.nome', 'equipamento_protecaos.tipo'])
			}

			return query
		} catch (error) {
			console.log(error)
			throw error
		}
	}

	async buscarBeneficios(payload) {
		try {
			let beneficio_id = payload.beneficio_id
			let tipo = !payload.tipo ? null : payload.tipo

			const query = await Model.query()
				.with('pessoa')
				.with('equipamentoProtecoes')
				//.setHidden(['idPai'])
				.where('status', 'Ativo')
				.fetch()

			let arr = []

			for (let i in query.rows) {
				let e = query.rows[i]
				let pessoa = await e.pessoa().fetch()
				let o = {
					equipamento_id: e.id,
					nome: pessoa.nome,
					pessoa_status: pessoa.status,
					marca1: e.marca1,
					modelo1: e.modelo1,
					placa1: e.placa1,
					status: e.status,
					protecao: null,
					beneficio_id: null,
				}
				let beneficios = await e.equipamentoBeneficios().fetch()

				let isAddNaoContem = true
				let semBeneficios = '' // "0001" 1= tem beneficio 0= nao tem beneficio

				if (tipo === 'sem-beneficios') {
					if (beneficios.rows.length === 0) {
						arr.push(o)
					}
				}

				beneficios.rows.forEach(x => {
					if (tipo === 'contem') {
						if (x.beneficio_id === beneficio_id && x.status === 'Ativo') {
							o.beneficio_id = x.beneficio_id
							arr.push(o)
						}
					}
					if (tipo === 'nao-contem') {
						if (x.beneficio_id === beneficio_id && x.status === 'Ativo') {
							o.beneficio_id = x.beneficio_id
							isAddNaoContem = false // não exibir registro
						}
					}

					if (tipo === 'sem-beneficios') {
						if (x.status === 'Inativo') {
							o.beneficio_id = x.beneficio_id
							semBeneficios = semBeneficios + '1'
						}
					}
				})

				if (tipo === 'nao-contem') {
					if (isAddNaoContem) {
						arr.push(o)
					}
				}

				if (tipo === 'sem-beneficios') {
					if (semBeneficios.includes('1') === true) {
						arr.push(o)
					}
				}
			}

			return arr
		} catch (error) {
			console.log(error)
			throw error
		}
	}

	/*async buscarBaixas(payload) {
      // Opção controle - baixas
      try {

      } catch (error) {

      }

   }*/

	async localizarControlePor(payload) {
		try {
			const field_name = payload.field_name
			const field_value = payload.field_value
			const field_status_value = payload.field_status_value

			const query = Database.select([
				'equipamento_controles.*',
				'pessoas.nome as pessoa_nome',
				'pessoas.nome as pessoa_nome_equipa',
				'pessoas.cpfCnpj as pessoa_cpfCnpj',
				'equipamentos.dAdesao',
				'equipamentos.pessoa_id',
				'equipamentos.placas',
				'equipamentos.especie1',
				'equipamentos.placa1',
				'equipamentos.marca1',
				'equipamentos.anoF1',
				'equipamentos.modelo1',
				'equipamentos.modeloF1',
				'users.username',
			])
				.table('equipamento_controles')
				.leftOuterJoin(
					'pessoas',
					'equipamento_controles.pessoa_id',
					'pessoas.id'
				)
				.leftOuterJoin(
					'equipamentos',
					'equipamento_controles.equipamento_id',
					'equipamentos.id'
				)
				.leftOuterJoin('users', 'equipamento_controles.user_id', 'users.id')
				.orderBy('created_at', 'desc')

			if (field_name === 'tipo') {
				query.whereIn('equipamento_controles.tipo', field_value)
			}

			if (field_status_value) {
				query.where('equipamento_controles.status', field_status_value)
			}

			return await query.paginate(1, 40)
		} catch (e) {
			throw e
		}
	}

	async localizarPor(payload) {
		try {
			const field_name = payload.field_name
			const field_value = payload.field_value

			const query = Database.select([
				'equipamentos.id',
				'equipamentos.dAdesao',
				'equipamentos.pessoa_id',
				'equipamentos.placas',
				'pessoas.nome as pessoa_nome',
				'pessoas.cpfCnpj as pessoa_cpfCnpj',
				'equipamentos.status as status',
				'especie1',
				'especie2',
				'especie3',
				'placa1',
				'placa2',
				'placa3',
				'marca1',
				'marca2',
				'marca3',
				'anoF1',
				'anoF2',
				'anoF3',
				'modelo1',
				'modelo2',
				'modelo3',
				'modeloF1',
				'modeloF2',
				'modeloF3',
				'categoria_id',
				//'equipamento_beneficios.benefico_id as beneficio_id',
				//'beneficios.descricao',
			])
				.table('equipamentos')
				.leftOuterJoin('pessoas', 'equipamentos.pessoa_id', 'pessoas.id')

				.table('equipamentos')
				.leftOuterJoin(
					'equipamento_beneficios',
					'equipamentos.id',
					'equipamento_beneficios.equipamento_id'
				)

			if (field_name === 'placa') {
				query.where('placas', 'like', '%' + field_value + '%')
			}

			if (field_name === 'nome') {
				query.where('pessoas.nome', 'like', '%' + field_value + '%')
			}

			return await query.paginate(1, 40)
		} catch (e) {
			throw e
		}
	}

	async localizarBeneficioPorModelo(modelo) {
		try {
			const query = await Database.select([
				'equipamentos.id',
				'placas',
				'dAdesao',
				'pessoa_id',
				'equipamentos.status',
				'especie1',
				'especie2',
				'especie3',
				'placa1',
				'placa2',
				'placa3',
				'marca1',
				'marca2',
				'marca3',
				'modelo1',
				'modelo2',
				'modelo3',
				'anoF1',
				'anoF2',
				'anoF3',
				'modeloF1',
				'modeloF2',
				'modeloF3',
				'categoria_id',
				'beneficios.id as beneficios_id',
				'beneficios.descricao as beneficios_descricao',
				'beneficios.status as beneficios_status',
				'beneficios.modelo as beneficios_modelo',
				'equipamento_beneficios.dTermino as equipamento_beneficio_dTermino',
				'equipamento_beneficios.status as equipamento_beneficio_status',
				'pessoas.nome AS pessoa_nome',
				'pessoas.cpfCnpj AS pessoa_cpfCnpj',
			])
				.from('equipamentos')
				.distinct('equipamentos.id')
				.leftOuterJoin(
					'equipamento_beneficios',
					'equipamentos.id',
					'equipamento_beneficios.equipamento_id'
				)
				.leftOuterJoin(
					'beneficios',
					'equipamento_beneficios.beneficio_id',
					'beneficios.id'
				)
				.innerJoin('pessoas', 'equipamentos.pessoa_id', 'pessoas.id')
				.where('equipamentos.status', 'Ativo')
				.where('beneficios.modelo', modelo)
			//.fetch()

			return query
		} catch (e) {
			throw e
		}
	}
	//localizarEquipaPorBeneficio
	async localizarEquipaPorAssist24h(payload) {
		try {
			let field_name = payload.field_name
			let field_value = payload.field_value
			let beneficio_id = payload.beneficio_id

			/*let beneficios = await ModelBeneficio.query() //.select('id')
            .select('id')
            .where('modelo', 'Assistencia 24h')
            .fetch()
         let arrBeneficios = []
         beneficios.rows.forEach(e => {
            arrBeneficios.push(e.id)
         })*/

			let where = ''

			if (field_name === 'placa') {
				where = 'equipamentos.placas LIKE ?'
				field_value = '%' + field_value + '%'
			}

			if (field_name === 'nome') {
				where = 'pessoas.nome LIKE ?'
				field_value = '%' + field_value + '%'
			}

			const limit = ' LIMIT 30'

			let sql = `
         SELECT
            equipamentos.id,
            placas,
            dAdesao,
            pessoa_id,
            equipamentos.status,
            especie1,
            especie2,
            especie3,
            placa1,
            placa2,
            placa3,
            marca1,
            marca2,
            marca3,
            modelo1,
            modelo2,
            modelo3,
            anoF1,
            anoF2,
            anoF3,
            modeloF1,
            modeloF2,
            modeloF3,
            categoria_id,
            beneficios.id as beneficios_id,
            beneficios.descricao as beneficios_descricao,
            beneficios.status as beneficios_status,
            equipamento_beneficios.dTermino as equipamento_beneficio_dTermino,
            equipamento_beneficios.status as equipamento_beneficio_status,
            pessoas.nome AS pessoa_nome,
            pessoas.cpfCnpj AS pessoa_cpfCnpj
         FROM
               ${DB_DATABASE}.equipamento_beneficios
                  LEFT outer JOIN
               ${DB_DATABASE}.equipamentos ON equipamento_beneficios.equipamento_id = equipamentos.id
               LEFT outer  JOIN
               ${DB_DATABASE}.beneficios ON equipamento_beneficios.beneficio_id = beneficios.id
               LEFT  outer JOIN
               ${DB_DATABASE}.pessoas on equipamentos.pessoa_id = pessoas.id
         WHERE

               beneficios.modelo = 'Assistencia 24h' and ${where}

         ${limit}


         `

			const query = await Database.raw(sql, [field_value])

			return query
		} catch (e) {
			throw e
		}
	}

	async localizarPorCategoria(categoria) {
		const equipamento = await Model.query()
			.where('especie1', categoria)
			.where('status', 'Ativo')
			//.with('equipamentoStatuses')
			.with('pessoa', build => {
				build.select('id', 'nome', 'cpfCnpj')
			})

			.with('categoria')
			//.with('equipamentoProtecoes')
			//.with('equipamentoBeneficios')
			//.with('equipamentoBeneficios.beneficio')
			.fetch()

		return equipamento
	}

	async localizarPorSubCategoria(categoria_id) {
		const equipamento = await Model.query()
			.where('categoria_id', categoria_id)
			.where('status', 'Ativo')
			//.with('equipamentoStatuses')
			.with('pessoa', build => {
				build.select('id', 'nome', 'cpfCnpj')
			})

			.with('categoria')
			//.with('equipamentoProtecoes')
			//.with('equipamentoBeneficios')
			//.with('equipamentoBeneficios.beneficio')
			.fetch()

		return equipamento
	}

	async relatorioAdesao(payload) {
		let dStart = null
		let dEnd = null

		if (payload.field_value_periodo) {
			dStart = payload.field_value_periodo.start
			dEnd = payload.field_value_periodo.end
		}

		const query = await Model.query()
			.whereBetween('dAdesao', [dStart.substr(0, 10), dEnd.substr(0, 10)])

			.select(
				'id',
				'idPrincipal',
				'pessoa_id',
				'preCadastro_id',
				'categoria_id',
				'dAdesao',
				'dEndosso',
				'marca1',
				'modelo1',
				'placa1 as placa',
				'modeloF1',
				'anoF1',
				'status'
			)
			//.with('equipamentoStatuses')
			.with('pessoa', build => {
				build.select('id', 'nome', 'cpfCnpj')
			})

			.with('categoria', build => {
				build.select('id', 'abreviado', 'tipo')
			})

			.with('osAdesao')
			//.orderBy('dAdesao', 'asc')
			.orderBy(['idPrincipal', 'id'], 'desc')

			.fetch()

		let arr = []
		const queryJSON = query.toJSON()
		const totais = {
			items: 0,
			total: 0.0,
		}

		let codigo = -1

		for (const key in queryJSON) {
			if (Object.hasOwnProperty.call(queryJSON, key)) {
				const e = queryJSON[key]

				let continua = false

				if (e.idPrincipal === 0) {
					codigo = -1
				}

				/*if (codigo !== e.idPrincipal) {
					switch (e.status) {
						case 'Ativo':
							if (e.dEndosso) {
								if (
									moment(e.dEndosso).format('YYYY-MM-DD') <=
									dEnd.substr(0, 10)
								) {
									codigo = e.idPrincipal
									continua = true
								}
							} else {
								continua = true
								codigo = e.idPrincipal
							}

							break

						case 'Inativo':
							codigo = e.idPrincipal
							break

						case 'Endossado':
							codigo = e.idPrincipal
							continua = true
							break

						default:
							if (e.dEndosso) {
								if (
									moment(e.dEndosso).format('YYYY-MM-DD') <=
									dEnd.substr(0, 10)
								) {
									codigo = e.idPrincipal
									continua = true
								}
							} else {
								codigo = e.idPrincipal
								continua = true
							}

							break
					}
				}*/

				if (codigo !== e.idPrincipal) {
					e.dAdesaoMA = moment(e.dAdesao, 'YYYY-MM-DD').format('YYYYMM')
					e.dEndossoMA = e.dEndosso
						? moment(e.dEndosso, 'YYYY-MM-DD').format('YYYYMM')
						: null
					if (e.dEndosso) {
						if (e.dAdesaoMA === e.dEndossoMA) {
							if (e.status === 'Inativo') {
								continua = false
								codigo = e.idPrincipal
							} else {
								continua = true
								codigo = e.idPrincipal
							}
						}
					} else {
						if (e.status === 'Inativo') {
							continua = false
							codigo = e.idPrincipal
						} else {
							continua = true
							codigo = e.idPrincipal
						}
					}
				}

				if (continua) {
					let placa = `${e.placa}`
					placa = placa.substr(0, 3) + '-' + placa.substr(3)
					placa = placa.toUpperCase()

					let obj = {
						id: e.id,
						equipamento: `${e.marca1} ${e.modelo1}`,
						ano_modelo: `${e.anoF1} / ${e.modeloF1}`,
						placa: placa,
						categoria_id: e.categoria_id,
						categoria_abrev: e.categoria.abreviado,
						categoria_tipo: e.categoria.tipo,
						pessoa_id: e.pessoa_id,
						pessoa_nome: e.pessoa.nome,
						os_status: null,
						os_valor: 0.0,
						os_id: null,
						dAdesao: moment(e.dAdesao, 'YYYY-MM-DD').format('DD/MM/YYYY'),
						dAdesaoOriginal: e.dAdesao,
						dEndosso: e.dEndosso
							? moment(e.dEndosso, 'YYYY-MM-DD').format('DD/MM/YYYY')
							: null,
						preCadastro_id: e.preCadastro_id,
						status: e.status,
					}

					if (e.osAdesao) {
						obj.os_status = e.osAdesao.status
						obj.os_valor = e.osAdesao.valorTotal
						obj.os_id = e.osAdesao.id
					}

					totais.items = totais.items + 1
					totais.total =
						totais.total +
						(lodash.isNull(e.osAdesao) ? 0.0 : e.osAdesao.valorTotal)

					arr.push(obj)
				}
			}
		}

		return { totais, data: lodash.orderBy(arr, ['dAdesaoOriginal'], ['asc']) }
	}

	async relatorioBaixaCancelamento(payload) {
		let dStart = null
		let dEnd = null
		let tipoEndosso = []

		switch (payload.tipoEndosso) {
			case 'cancelamento':
				tipoEndosso.push('Cancelamento de Equipamento')
				break

			case 'baixa':
				tipoEndosso.push('Baixa do Equipamento')
				tipoEndosso.push('Baixa total equipamento')
				break

			default:
				tipoEndosso.push('Baixa do Equipamento')
				tipoEndosso.push('Baixa total equipamento')
				tipoEndosso.push('Cancelamento de Equipamento')
				break
		}

		if (payload.field_value_periodo) {
			dStart = payload.field_value_periodo.start
			dEnd = payload.field_value_periodo.end
		}

		const query = await Model.query()
			.whereBetween('dEndosso', [dStart.substr(0, 10), dEnd.substr(0, 10)])
			.whereIn('tipoEndosso', tipoEndosso)
			.where('status', 'Inativo')

			.select(
				'id',
				'pessoa_id',
				'tipoEndosso',
				'preCadastro_id',
				'categoria_id',
				'dAdesao',
				'dEndosso',
				'marca1',
				'modelo1',
				'placa1 as placa',
				'modeloF1',
				'anoF1',
				'status'
			)
			//.with('equipamentoStatuses')
			.with('pessoa', build => {
				build.select('id', 'nome', 'cpfCnpj')
			})

			.with('categoria', build => {
				build.select('id', 'abreviado', 'tipo')
			})

			//.with('osAdesao')
			.orderBy(['idPrincipal', 'id'], 'desc')
			//.groupBy('id', 'desc')

			.fetch()

		let arr = []
		const queryJSON = query.toJSON()
		const totais = {
			items: 0,
			total: 0.0,
			itemsCancelado: 0.0,
			itemsBaixado: 0.0,
		}

		for (const key in queryJSON) {
			if (Object.hasOwnProperty.call(queryJSON, key)) {
				const e = queryJSON[key]

				let placa = `${e.placa}`
				placa = placa.substr(0, 3) + '-' + placa.substr(3)
				placa = placa.toUpperCase()

				let obj = {
					id: e.id,
					equipamento: `${e.marca1} ${e.modelo1}`,
					ano_modelo: `${e.anoF1} / ${e.modeloF1}`,
					tipoEndosso: e.tipoEndosso,
					placa: placa,
					categoria_id: e.categoria_id,
					categoria_abrev: e.categoria.abreviado,
					categoria_tipo: e.categoria.tipo,
					pessoa_id: e.pessoa_id,
					pessoa_nome: e.pessoa.nome,
					os_status: null,
					os_valor: 0.0,
					os_id: null,
					dAdesao: moment(e.dAdesao, 'YYYY-MM-DD').format('DD/MM/YYYY'),
					dEndosso: moment(e.dEndosso, 'YYYY-MM-DD').format('DD/MM/YYYY'),
					preCadastro_id: e.preCadastro_id,
					status: e.status,
				}

				totais.items = totais.items + 1

				if (e.tipoEndosso === 'Cancelamento de Equipamento') {
					totais.itemsCancelado += 1
				} else {
					totais.itemsBaixado += 1
				}

				arr.push(obj)
			}
		}

		return { totais, data: arr }
	}

	async relatorioEquipamentoBeneficioAtivo(payload) {
		let dStart = null
		let dEnd = null

		if (payload.field_value_periodo) {
			dStart = payload.field_value_periodo.start
			dEnd = payload.field_value_periodo.end
		}

		const query = await Model.query()
			.where('status', 'Ativo')

			.select(
				'id',
				'idPrincipal',
				'pessoa_id',
				'preCadastro_id',
				'categoria_id',
				'dAdesao',
				'dEndosso',
				'marca1',
				'modelo1',
				'placa1 as placa',
				'modeloF1',
				'anoF1',
				'status'
			)
			//.with('equipamentoStatuses')
			.with('pessoa', build => {
				build.select('id', 'nome', 'cpfCnpj')
			})

			.with('categoria', build => {
				build.select('id', 'abreviado', 'tipo')
			})

			.with('equipamentoBeneficios')
			.with('equipamentoBeneficios.beneficio')

			.fetch()

		let arr = []
		const queryJSON = query.toJSON()

		let items = 0
		let itemsBeneficios = 0

		for (const key in queryJSON) {
			if (Object.hasOwnProperty.call(queryJSON, key)) {
				const e = queryJSON[key]

				let placa = `${e.placa}`
				placa = placa.substr(0, 3) + '-' + placa.substr(3)
				placa = placa.toUpperCase()

				let obj = {
					id: e.id,
					equipamento: `${e.marca1} ${e.modelo1}`,
					ano_modelo: `${e.anoF1} / ${e.modeloF1}`,
					placa: placa,
					categoria_id: e.categoria_id,
					categoria_abrev: e.categoria.abreviado,
					categoria_tipo: e.categoria.tipo,
					pessoa_id: e.pessoa_id,
					pessoa_nome: e.pessoa.nome,
					dAdesao: moment(e.dAdesao, 'YYYY-MM-DD').format('DD/MM/YYYY'),
					dAdesaoOriginal: e.dAdesao,
					dEndosso: e.dEndosso
						? moment(e.dEndosso, 'YYYY-MM-DD').format('DD/MM/YYYY')
						: null,
					status: e.status,
					beneficios: '',
				}

				items++

				let beneficios = ''
				for (const keyBen in e.equipamentoBeneficios) {
					if (
						Object.hasOwnProperty.call(e.equipamentoBeneficios, keyBen)
					) {
						const b = e.equipamentoBeneficios[keyBen]
						if (b.status === 'Ativo') {
							if (!lodash.isEmpty(beneficios)) {
								beneficios = beneficios + '|'
							}
							beneficios += b.beneficio.descricao
							itemsBeneficios++
						}
					}
				}
				obj.beneficios = beneficios

				arr.push(obj)
			}
		}

		return {
			items,
			itemsBeneficios,
			data: lodash.orderBy(arr, ['pessoa_nome'], ['asc']),
		}
	}

	async EXCLUIR_relatorioCancelamento(payload) {
		let dStart = null
		let dEnd = null

		if (payload.field_value_periodo) {
			dStart = payload.field_value_periodo.start
			dEnd = payload.field_value_periodo.end
		}

		const query = await Model.query()
			.whereBetween('dAdesao', [dStart.substr(0, 10), dEnd.substr(0, 10)])

			.select(
				'id',
				'pessoa_id',
				'preCadastro_id',
				'categoria_id',
				'dAdesao',
				'marca1',
				'modelo1',
				'placa1 as placa',
				'modeloF1',
				'anoF1',
				'status'
			)
			//.with('equipamentoStatuses')
			.with('pessoa', build => {
				build.select('id', 'nome', 'cpfCnpj')
			})

			.with('categoria', build => {
				build.select('id', 'abreviado', 'tipo')
			})

			//.with('osAdesao')
			.orderBy(['idPrincipal', 'id'], 'desc')
			//.groupBy('id', 'desc')

			.fetch()

		const queryJSON = query.toJSON()
		const totais = {
			items: 0,
			total: 0.0,
		}

		let arr = []

		let parse = -1

		for (const key in queryJSON) {
			if (Object.hasOwnProperty.call(queryJSON, key)) {
				const e = queryJSON[key]
				if (e.status === 'Inativo') {
					if (!lodash.isNull(e.dEndosso)) {
						if (e.dEndosso.substr(0, 10) <= dEnd.substr(0, 10)) {
							parse = e.idPrincipal
						}
					}
				}
			}
		}

		return query.rows
	}
}

module.exports = Equipamento

const gerarPlacas = r => {
	if (!r) return null
	let placas = ''
	if ((lodash.r, 'placa1')) {
		if (r.placa1) placas = r.placa1.replace(/\W/g, '')
	}
	if ((lodash.r, 'placa2')) {
		if (r.placa2) placas = placas + '|' + r.placa2.replace(/\W/g, '')
	}
	if ((lodash.r, 'placa3')) {
		if (r.placa3) placas = placas + '|' + r.placa3.replace(/\W/g, '')
	}
	return placas == '' ? null : placas
}
