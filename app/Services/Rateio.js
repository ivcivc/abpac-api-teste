'use strict'

const lodash = require('lodash')
const ModelEquipamento = use('App/Models/Equipamento')
const ModelOrdemServico = use('App/Models/ordem_servico/OrdemServico')
const ModelLancamento = use('App/Models/Lancamento')
const ModelLancamentoItem = use('App/Models/LancamentoItem')
const Model = use('App/Models/Rateio')
const ServiceConfig = use('App/Services/LancamentoConfig')

const ModelConta = use('App/Models/Conta')
const ModelBoletoConfig = use('App/Models/BoletoConfig')
const ModelRateioConfig = use('App/Models/RateioConfig')
const ModelBoleto = use('App/Models/Boleto')
const ModelEmailLog = use('App/Models/EmailLog')

const Boleto = use('App/Services/Cnab')

const LancamentoService = use('App/Services/Lancamento')

const moment = require('moment')

const Database = use('Database')

const Redis = use('Redis')

const kue = use('Kue')
const Job = use('App/Jobs/ACBr')

class Rateio {
   async get(ID) {
      try {
         const rateio = await Model.findOrFail(ID)
         await rateio.load('equipamentos')
         await rateio.load('categorias')
         await rateio.load('resumos')
         //await rateio.load('os')

         const os = await this.lista_os(rateio.id)

         return { rateio, os }
      } catch (e) {
         throw e
      }
   }

   async index() {
      const rateio = await Model.query().orderBy('id', 'desc').fetch()

      return rateio
   }

   async config() {
      const rateio = await ModelRateioConfig.query().fetch()
      let conta = await ModelConta.query()
         .where('status', 'Ativo')
         .whereNot('modeloBoleto', '-1')
         .fetch()
      return { rateio, contas: conta }
   }

   async addOrUpdateConfig(payload) {
      try {
         const config = await ModelRateioConfig.query().fetch()

         let registro = null
         let res = null

         if (config.rows.length > 0) {
            registro = config.rows[0]
            res = await ModelRateioConfig.findOrFail(registro.id)
            res.merge(payload)
            await res.save()
         } else {
            res = await ModelRateioConfig.create(payload)
         }

         return res
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

   async equipamentosAtivos() {
      try {
         const query = await ModelEquipamento.query()
            .select(
               'id',
               'placa1',
               'categoria_id',
               'pessoa_id',
               'dAdesao',
               'status',
               'especie1',
               'marca1',
               'modelo1',
               'placa1',
               'chassi1',
               'anoF1',
               'modeloF1',
               'especie2',
               'marca2',
               'modelo2',
               'placa2',
               'chassi2',
               'anoF2',
               'modeloF2',
               'especie3',
               'marca3',
               'modelo3',
               'placa3',
               'chassi3',
               'anoF3',
               'modeloF3',
               'updated_at'
            )

            .with('pessoa', builder => {
               builder.select(
                  'id',
                  'status',
                  'nome',
                  'tipoPessoa',
                  'cpfCnpj',
                  'telSms',
                  'parcela',
                  'descontoEspecial',
                  'endRua',
                  'endComplemento',
                  'endBairro',
                  'endCidade',
                  'endEstado',
                  'endCep'
               )
            })

            .with('categoria', builder => {
               builder.select(
                  'id',
                  'ordem',
                  'abreviado',
                  'nome',
                  'tipo',
                  'valorTaxaAdm',
                  'percentualRateio'
               )
            })

            .with('equipamentoBeneficios', builder => {
               builder.with('beneficio', b => {
                  b.select('id', 'descricao', 'rateio', 'valor')
               })
               builder.where('status', 'Ativo')
               //builder.where('beneficio.rateio', 'Sim')
            })

            //.where('id', '>', 1700)
            .where('status', 'Ativo')
            .fetch()

         let queryJson = query.toJSON()

         let categorias = []

         queryJson.forEach(e => {
            e.valorTaxaAdmBase = e.categoria.valorTaxaAdm
            e.valorBeneficiosBase = 0.0
            e.valorRateio = 0.0
            e.valorBeneficios = 0.0
            e.valorTaxaAdm = e.categoria.valorTaxaAdm
            e.valorTotal = 0.0

            let arrBeneficios = []
            e.equipamentoBeneficios.forEach(b => {
               if (b.beneficio.rateio === 'Sim') {
                  e.valorBeneficios += b.beneficio.valor
                  e.valorBeneficiosBase += b.beneficio.valor
                  arrBeneficios.push(b)
               }
            })

            e.equipamentoBeneficios = arrBeneficios

            /*for (var i in e.equipamentoBeneficios) {
               let b = e.equipamentoBeneficios[i]
               if (b.beneficio.rateio === 'Sim') {
                  console.log('beneficio .... ', b.beneficio.nome)
                  b.valorBeneficios += b.beneficio.valor
                  b.valorBeneficiosBase += b.beneficio.valor
               } else {
                  console.log('excluindo .... ')
                  delete e.equipamentoBeneficios[i]
               }
            }*/

            e.pessoa_parcela = e.pessoa.parcela
            e.pessoa_descontoEspecial =
               e.pessoa.descontoEspecial > 0 ? e.pessoa.descontoEspecial : 0

            if (e.pessoa.descontoEspecial === 0) {
               let res = lodash.find(categorias, {
                  categoria_id: e.categoria.id,
                  isEspecial: false,
                  grupo: 0,
               })
               if (res) {
                  res.qtd++
               } else {
                  categorias.push({
                     //id: new Date().getTime(),
                     isEspecial: false,
                     grupo: 0,
                     ordem: e.categoria.ordem,
                     abreviado: e.categoria.abreviado,
                     categoria_id: e.categoria.id,
                     nome: e.categoria.nome,
                     percentualBase: e.categoria.percentualRateio,
                     percentualEspecial: e.categoria.percentualRateio,
                     percEditavel: e.categoria.percentualRateio,
                     qtd: 1,
                     txAdm: e.categoria.valorTaxaAdm,
                  })
               }
            } else {
               let res = lodash.find(categorias, {
                  categoria_id: e.categoria.id,
                  isEspecial: true,
                  grupo: e.pessoa.descontoEspecial,
                  percentualEspecial: e.pessoa.descontoEspecial,
               })
               if (res) {
                  res.qtd++
               } else {
                  let perc = (100 - e.pessoa.descontoEspecial) * 0.01
                  /*e.categoria.percentualRateio -
                     e.categoria.percentualRateio *
                        (e.pessoa.descontoEspecial * 0.01)*/
                  /*e.categoria.percentualRateio -
                     (e.categoria.percentualRateio *
                        e.pessoa.descontoEspecial) /
                        100*/
                  categorias.push({
                     id: new Date().getTime(),
                     isEspecial: true,
                     ordem: e.categoria.ordem,
                     abreviado: e.categoria.abreviado,
                     grupo: e.pessoa.descontoEspecial,
                     categoria_id: e.categoria.id,
                     nome: e.categoria.nome,
                     percentualBase: e.categoria.percentualRateio,
                     percentualEspecial: e.pessoa.descontoEspecial,
                     percEditavel: perc,
                     qtd: 1,
                     txAdm: e.categoria.valorTaxaAdm,
                  })
               }
            }
         })

         const orderCategoria = lodash.orderBy(
            categorias,
            ['nome', 'percEditavel'],
            ['desc', 'desc']
         )

         //orderCategoria.forEach(e => console.log(e))

         return { categorias: orderCategoria, equipamentos: queryJson }
      } catch (e) {
         throw e
      }
   }

   async lista_os(rateio_id = null) {
      try {
         let query = null

         if (rateio_id) {
            query = await ModelOrdemServico.query()
               .select(
                  'id',
                  'marcado',
                  'dCompetencia',
                  'pessoa_id',
                  'ocorrencia_id',
                  'equipamento_id',
                  'config_id',
                  'isCredito',
                  'valorTotal',
                  'status',
                  'updated_at'
               )

               .with('config', builder => {
                  builder.select('id', 'descricao', 'modelo')
               })

               .with('pessoa', builder => {
                  builder.select('id', 'status', 'nome', 'tipoPessoa')
               })

               .with('equipamento')

               .with('items')
               .with('ocorrencia', builder => {
                  builder.select(
                     'id',
                     'equipamento_id',
                     'tipoAcidente',
                     'dEvento',
                     'qualPlaca',
                     'pessoa_id'
                  ),
                     builder.with('equipamento', e => {
                        e.select(
                           'id',
                           'categoria_id',
                           'placa1',
                           'especie1',
                           'marca1',
                           'modelo1',
                           'placa1',
                           'chassi1',
                           'anoF1',
                           'modeloF1',
                           'placa2',
                           'especie2',
                           'marca2',
                           'modelo2',
                           'placa2',
                           'chassi2',
                           'anoF2',
                           'modeloF2',
                           'placa3',
                           'especie3',
                           'marca3',
                           'modelo3',
                           'placa3',
                           'chassi3',
                           'anoF3',
                           'modeloF3'
                        )
                     })

                  builder.with('pessoa', builder => {
                     builder.select('id', 'status', 'nome', 'tipoPessoa')
                  })
               })

               .orderBy('ocorrencia_id')

               .where('rateio_id', rateio_id)
               .fetch()
         } else {
            query = await ModelOrdemServico.query()
               .select(
                  'id',
                  'marcado',
                  'dCompetencia',
                  'pessoa_id',
                  'ocorrencia_id',
                  'equipamento_id',
                  'config_id',
                  'isCredito',
                  'valorTotal',
                  'status',
                  'updated_at'
               )

               .with('config', builder => {
                  builder.select('id', 'descricao', 'modelo')
               })

               .with('pessoa', builder => {
                  builder.select('id', 'status', 'nome', 'tipoPessoa')
               })

               .with('equipamento')

               .with('items')
               .with('ocorrencia', builder => {
                  builder.select(
                     'id',
                     'equipamento_id',
                     'tipoAcidente',
                     'dEvento',
                     'qualPlaca',
                     'pessoa_id'
                  ),
                     builder.with('equipamento', e => {
                        e.select(
                           'id',
                           'categoria_id',
                           'placa1',
                           'especie1',
                           'marca1',
                           'modelo1',
                           'placa1',
                           'chassi1',
                           'anoF1',
                           'modeloF1',
                           'placa2',
                           'especie2',
                           'marca2',
                           'modelo2',
                           'placa2',
                           'chassi2',
                           'anoF2',
                           'modeloF2',
                           'placa3',
                           'especie3',
                           'marca3',
                           'modelo3',
                           'placa3',
                           'chassi3',
                           'anoF3',
                           'modeloF3'
                        )
                     })

                  builder.with('pessoa', builder => {
                     builder.select('id', 'status', 'nome', 'tipoPessoa')
                  })
               })

               .orderBy('ocorrencia_id')

               .whereNull('rateio_id')
               .where('isRatear', true)
               .whereNot('status', 'Cancelado')
               .fetch()
         }

         let queryJson = query.toJSON()

         let arrTree = []

         queryJson.forEach(e => {
            e.ordem_servico_id = e.id
            e.isRoot = false

            if (e.isCredito) {
               e.valorTotal = e.valorTotal * -1
            }
            e.value = `O.S.: # ${e.id} - ${e.config.descricao}`
            if (e.ocorrencia_id) {
               let resTitulo = lodash.find(arrTree, {
                  tag: '_ocorrencia',
               })
               if (!resTitulo) {
                  arrTree.push({
                     value: 'OCORRÊNCIA',
                     tag: '_ocorrencia',
                     isRoot: true,
                     associado: null,
                     data: [],
                  })
               }

               let res = lodash.find(arrTree, {
                  tag: '_ocorrencia',
               })

               let pai = lodash.find(res.data, {
                  ocorrencia_id: e.ocorrencia_id,
               })
               if (!pai) {
                  let historico = `Ocorrencia: # ${e.ocorrencia_id} (${e.ocorrencia.tipoAcidente})`
                  let oPai = {
                     ocorrencia_id: e.ocorrencia_id,
                     value: historico.toUpperCase(),
                     associado: e.ocorrencia.pessoa.nome,
                     isRoot: true,
                     data: [e],
                  }
                  res.data.push(oPai)
               } else {
                  pai.data.push(e)
               }
            }

            if (!e.ocorrencia_id) {
               e.ordem_servico_id = e.id
               e.value = `${e.config.descricao}`

               let resTitulo = lodash.find(arrTree, {
                  tag: e.config.modelo,
               })
               if (!resTitulo) {
                  arrTree.push({
                     value: e.config.descricao.toUpperCase(),
                     tag: e.config.modelo,
                     isRoot: true,
                     associado: null,
                     data: [],
                  })
               }

               let res = lodash.find(arrTree, {
                  tag: e.config.modelo,
               })

               if (!res) {
                  let oPai = {
                     //ordem_servico_id: e.ordem_servico_id,
                     value: `O.S.: # ${e.ordem_servico_id} `,
                     associado: null,
                     isRoot: true,
                     data: [e],
                  }
                  res.data.push(oPai)
               } else {
                  res.data.push(e)
               }
            }
         })

         return arrTree //queryJson
      } catch (e) {
         throw e
      }
   }

   async inadimplentes() {
      try {
         const query = await ModelLancamento.query()
            .select(
               'id',
               'valorTotal',
               'status',
               'pessoa_id',
               'dVencimento',
               'situacao',
               'inadimplente',
               'updated_at'
            )

            .with('pessoa', builder => {
               builder.select('id', 'nome')
            })

            //.whereNull('rateio_id')
            .where('inadimplente', 'Sim')
            //.whereIn('status', ['Acordado', 'Inadimplente'])
            .whereIn('situacao', ['Aberto', 'Compensado'])
            .fetch()

         let queryJsonDebito = query.toJSON()

         const queryCredito = await ModelLancamento.query()
            .select(
               'id',
               'valorCompensado',
               'valorDebitoInad',
               'status',
               'pessoa_id',
               'dVencimento',
               'situacao',
               'inadimplente',
               'updated_at'
            )

            .with('pessoa', builder => {
               builder.select('id', 'nome')
            })

            //.whereNull('rateio_id')
            .where('inadimplente', 'Debito')

            //.whereIn('status', ['Acordado', 'Compensado'])
            .whereIn('situacao', ['Compensado'])
            .fetch()

         let queryJsonCredito = queryCredito.toJSON()

         queryJsonCredito.forEach(e => {
            if (e.valorCompensado > e.valorDebitoInad) {
               e.valorTotal = e.valorDebitoInad * -1
            } else {
               e.valorTotal = e.valorCompensado * -1
            }
         })

         return { debitos: queryJsonDebito, creditos: queryJsonCredito }
      } catch (e) {
         throw e
      }
   }

   async add(payload, trx, auth) {
      let nrErro = null

      let oRateio = {
         dInicio: moment(payload.periodo.start).format('YYYY-MM-DD'),
         dFim: moment(payload.periodo.end).format('YYYY-MM-DD'),
      }

      const rateio = await Model.create(oRateio, trx ? trx : null)
      let rateio_id = rateio.id

      const arrOS = []
      const updated_at = moment().format('YYYY-MM-DD hh:mm:ss')
      payload.os.forEach(e => {
         arrOS.push(e.ordem_servico_id)
      })

      const affectedRows = await Database.table('ordem_servicos')
         .whereIn('id', arrOS)
         .transacting(trx ? trx : null)
         .update({ rateio_id, updated_at })

      if (affectedRows != arrOS.length) {
         nrErro = -100
         throw {
            success: false,
            message: 'Não foi possível atualizar a ordem de serviço.',
         }
      }

      // Equipamentos
      let arrRateioEquipa = []
      for (const key in payload.equipamento) {
         if (payload.equipamento.hasOwnProperty(key)) {
            const e = payload.equipamento[key]
            let registroEquipa = {
               categoria_id: e.categoria_id,
               categoria_abreviado: e.categoria.abreviado,
               chassi: e.chassi1,
               dAdesao: moment(e.dAdesao).format('YYYY-MM-DD'),
               especie: e.especie1,
               anoF: e.anoF1,
               equipamento_id: e.id,
               marca: e.marca1,
               modelo: e.modelo1,
               modeloF: e.modeloF1,
               pessoa_nome: e.pessoa.nome,
               pessoa_descontoEspecial: e.pessoa_descontoEspecial,
               pessoa_id: e.pessoa_id,
               pessoa_parcela: e.pessoa_parcela,
               placa: e.placa1,
               valorBeneficios: e.valorBeneficios,
               valorBeneficiosBase: e.valorBeneficiosBase,
               valorRateio: e.valorRateio,
               valorTaxaAdm: e.valorTaxaAdm,
               valorTaxaAdmBase: e.valorTaxaAdmBase,
               valorTotal: e.valorTotal,
            }
            arrRateioEquipa.push(registroEquipa)
         }
      }
      await rateio.equipamentos().createMany(arrRateioEquipa, trx ? trx : null)

      // Inadimplente
      if (lodash.has(payload.inadimplente, 'creditos')) {
         let arrInadGravar = []
         for (const key in payload.inadimplente.creditos) {
            if (payload.inadimplente.creditos.hasOwnProperty(key)) {
               const e = payload.inadimplente.creditos[key]
               arrInadGravar.push({
                  tipo: 'credito',
                  valorTotal: e.valorTotal,
                  lancamento_id: e.lancamento_id,
               })
            }
         }
         await rateio
            .inadimplentes()
            .createMany(arrInadGravar, trx ? trx : null)

         for (const key in payload.inadimplente.creditos) {
            if (payload.inadimplente.creditos.hasOwnProperty(key)) {
               const e = payload.inadimplente.creditos[key]
               let affectedRows = await Database.table('lancamentos')
                  .where('id', e.lancamento_id)
                  .where('updated_at', e.updated_at)
                  .transacting(trx ? trx : null)
                  .update({
                     updated_at,
                     inadimplente: 'Credito',
                     valorCreditoInad: e.valorTotal,
                  })

               if (affectedRows != 1) {
                  nrErro = -100
                  throw {
                     success: false,
                     message:
                        'Não foi possível atualizar conta de crédito inadimplente .',
                  }
               }
               let planoContaID = await new ServiceConfig().getPlanoConta(
                  'receber-credito-inadimplente'
               )
               if (!planoContaID) {
                  nrErro = -100
                  throw {
                     success: false,
                     message:
                        'Transação abortada! Arquivo de configuração (lançamento) não localizado.',
                  }
               }
               await ModelLancamentoItem.create(
                  {
                     DC: 'D',
                     tag: 'IC',
                     lancamento_id: e.lancamento_id,
                     descricao: 'Crédito Inadimplente',
                     planoDeConta_id: planoContaID,
                     valor: e.valorTotal,
                  },
                  trx ? trx : null
               )
            }
         }
      }

      if (lodash.has(payload.inadimplente, 'debitos')) {
         let arrInadGravar = []
         for (const key in payload.inadimplente.debitos) {
            if (payload.inadimplente.debitos.hasOwnProperty(key)) {
               const e = payload.inadimplente.debitos[key]
               arrInadGravar.push({
                  tipo: 'debito',
                  valorTotal: e.valorTotal,
                  lancamento_id: e.lancamento_id,
               })
            }
         }
         await rateio
            .inadimplentes()
            .createMany(arrInadGravar, trx ? trx : null)

         for (const key in payload.inadimplente.debitos) {
            if (payload.inadimplente.debitos.hasOwnProperty(key)) {
               const e = payload.inadimplente.debitos[key]
               let affectedRows = await Database.table('lancamentos')
                  .where('id', e.lancamento_id)
                  .where('updated_at', e.updated_at)
                  .transacting(trx ? trx : null)
                  .update({
                     updated_at,
                     inadimplente: 'Debito',
                     valorDebitoInad: e.valorTotal,
                  })

               if (affectedRows != 1) {
                  nrErro = -100
                  throw {
                     success: false,
                     message:
                        'Não foi possível atualizar conta de débito inadimplente.',
                  }
               }
               let planoContaID = await new ServiceConfig().getPlanoConta(
                  'receber-debito-inadimplente'
               )
               if (!planoContaID) {
                  nrErro = -100
                  throw {
                     success: false,
                     message:
                        'Transação abortada! Arquivo de configuração (lançamento) não localizado.',
                  }
               }
               await ModelLancamentoItem.create(
                  {
                     DC: 'C',
                     tag: 'ID',
                     lancamento_id: e.lancamento_id,
                     descricao: 'Débito Inadimplente',
                     planoDeConta_id: planoContaID,
                     valor: e.valorTotal,
                  },
                  trx ? trx : null
               )
            }
         }
      }

      // Categoria
      await rateio.categorias().createMany(payload.calculo, trx ? trx : null)

      // Resumo
      await rateio.resumos().createMany(payload.resumo, trx ? trx : null)

      // Gravar coeficiente
      if (payload.isGravarCoeficiente) {
         for (const key in payload.calculo) {
            if (payload.calculo.hasOwnProperty(key)) {
               const e = payload.calculo[key]
               if (!e.isEspecial) {
                  await Database.table('categorias')
                     .where('id', e.categoria_id)
                     .transacting(trx ? trx : null)
                     .update({ percentualRateio: e.percentualBase })
               }
            }
         }
      }

      //await trx.rollback()
      await trx.commit()
   }

   async simulador(payload, trx, auth) {
      let nrErro = null

      const updated_at = moment().format('YYYY-MM-DD hh:mm:ss')

      if (payload.isGravarOS) {
         for (const key in payload.os) {
            if (payload.os.hasOwnProperty(key)) {
               const e = payload.os[key]
               const affectedRows = await Database.table('ordem_servicos')
                  .where('id', e.ordem_servico_id)
                  .transacting(trx ? trx : null)
                  .update({ marcado: e.marcado ? 1 : 0 })
            }
         }
      }

      // Gravar coeficiente
      if (payload.isGravarCoeficiente) {
         for (const key in payload.calculo) {
            if (payload.calculo.hasOwnProperty(key)) {
               const e = payload.calculo[key]
               if (!e.isEspecial) {
                  await Database.table('categorias')
                     .where('id', e.categoria_id)
                     .transacting(trx ? trx : null)
                     .update({ percentualRateio: e.percEditavel })
               }
            }
         }
      }

      await trx.commit()
   }

   async update(ID, data) {
      try {
         let model = await Model.findOrFail(ID)

         const dInicio = moment(data.periodo.start).format('YYYY-MM-DD')
         const dFim = moment(data.periodo.end).format('YYYY-MM-DD')

         model.merge({ dInicio, dFim })

         await model.save()

         return model
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

   async gerarFinanceiroLoc(rateio_id, auth) {
      try {
         let model = await Model.findOrFail(rateio_id)

         if (model.status !== 'Financeiro') {
            throw { message: 'Não é permitido a geração de financeiro.' }
         }

         const query = await Database.select([
            'e.rateio_id',
            'e.pessoa_id',
            'pessoa_nome',
            'p.cpfCnpj',
            'p.tipoPessoa',
            'p.parcela',

            'p.endRua',
            'p.endBairro',
            'p.endCidade',
            'p.endEstado',
            'p.endComplemento',
            'p.endCep',
            'p.telSms',
            'p.email',
         ])
            .from('rateio_equipamentos as e')
            .leftOuterJoin('pessoas as p', 'e.pessoa_id', 'p.id') //.where('pessoas.modulo', 'Associado')
            .groupBy('pessoa_id')
            .sum('e.valorBeneficios as valorBeneficios')
            .sum('valorTaxaAdm as valorTaxaAdm')
            .sum('valorRateio as valorRateio')
            .sum('valorTotal as valorTotal')
            .orderBy(['p.nome'])
            .where('e.rateio_id', rateio_id)

         let conta = await ModelConta.query()
            .where('status', 'Ativo')
            .whereNot('modeloBoleto', '-1')
            .fetch()

         let config = await ModelRateioConfig.query().fetch()

         return { rateio: model, lista: query, contas: conta, config }
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

   async gerarFinanceiro(payload, trx, auth) {
      try {
         let model = await Model.findOrFail(payload.rateio_id)

         if (model.status !== 'Financeiro') {
            throw { message: 'Não é permitido a geração de financeiro.' }
         }

         const update_at_db = moment(model.updated_at).format()
         const update_at = moment(payload.updated_at).format()

         if (update_at_db !== update_at) {
            nrErro = -100
            throw {
               success: false,
               message:
                  'Transação abortada! O cadastro de rateio foi alterado por outro usuário.',
            }
         }

         // Rateio config
         const rateioConfig = await ModelRateioConfig.findOrFail(
            payload.config_id
         )

         // Contas (plano de contas)
         const conta = await ModelConta.findOrFail(rateioConfig.conta_id)

         let dVenc = moment(payload.dVencimento).format('YYYY-MM-DD')
         let dcompe = moment(payload.dCompetencia).format('YYYY-MM-DD')

         model.merge({
            status: 'Concluido',
            dVencimento: dVenc,
            dCompetencia: dcompe,
         })

         let boletoConfig = await ModelBoletoConfig.findByOrFail(
            'modelo',
            conta.modeloBoleto
         )

         // Todos os registros do plano de contas para facilitar busca
         const planoDeContas = await Database.select('*').from(
            'plano_de_contas'
         )
         this.planoDeContas = planoDeContas

         const query = await Database.select([
            'e.rateio_id',
            'e.pessoa_id',
            'pessoa_nome',
            'p.cpfCnpj',
            'p.tipoPessoa',
            'p.parcela',

            'p.endRua',
            'p.endBairro',
            'p.endCidade',
            'p.endEstado',
            'p.endComplemento',
            'p.endCep',
            'p.telSms',
            'p.email',
         ])
            .from('rateio_equipamentos as e')
            .leftOuterJoin('pessoas as p', 'e.pessoa_id', 'p.id') //.where('pessoas.modulo', 'Associado')
            .groupBy('pessoa_id')
            .sum('e.valorBeneficios as valorBeneficios')
            .sum('valorTaxaAdm as valorTaxaAdm')
            .sum('valorRateio as valorRateio')
            .sum('valorTotal as valorTotal')
            .orderBy(['p.nome'])
            .where('e.rateio_id', payload.rateio_id)

         //await model.save(trx ? trx : null)

         let nossoNumero = boletoConfig.nossoNumero
         let mom = moment(payload.dVencimento)
         let ano = `${mom.year()}`
         ano.padEnd(2, '0')
         let nMes = mom.month() + 1 // janeiro === 0
         let mes = `${nMes}`
         mes.padEnd(2, '0')
         let mesAno = `${mes}/${ano}`
         let anoMes = `${ano}-${mes}-`

         for (const key in query) {
            if (Object.hasOwnProperty.call(query, key)) {
               const e = query[key]
               e.nossoNumero = nossoNumero
               boletoConfig.nossoNumero = nossoNumero++
               e.modeloBoleto = boletoConfig.modelo

               e.banco = conta.banco
               e.agencia = conta.agencia
               e.agenciaDV = conta.agenciaDV
               e.contaCorrente = conta.contaCorrente
               e.contaCorrenteDV = conta.contaCorrenteDV
               e.convenio = conta.convenio

               e.boleto_nota1 = payload.boleto_nota1
               e.boleto_nota2 = payload.boleto_nota2

               e.dVencimento2 = anoMes + e.parcela
               e.dVencimento = e.parcela + '/' + mesAno

               e.dCompetencia = moment(payload.dCompetencia).format(
                  'DD/MM/YYYY'
               )
               e.dCompetencia2 = moment(payload.dCompetencia).format(
                  'YYYY-MM-DD'
               )

               await boletoConfig.save()

               // Gerar lançamento de contas a receber
               let lancamentoAdd = await this.addReceber(
                  trx,
                  auth,
                  e,
                  rateioConfig
               )
               e.lancamento_id = lancamentoAdd.id

               let boletoAdd = await this.addBoleto(trx, auth, e, rateioConfig)
            }
         }

         const boleto = await new Boleto().gerarBoleto(query)

         if (!boleto.success) {
            throw boleto
         }
         //query.forEach(e => {})

         await model.save(trx ? trx : null)

         return model
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

   async addReceber(trx, auth, item, contaRateio) {
      return new Promise(async (resolve, reject) => {
         const lanca = {
            tipo: 'Receita',
            dVencimento: item.dVencimento2,
            dCompetencia: item.dCompetencia2,
            parcelaI: 1,
            parcelaF: 1,
            rateio_id: item.rateio_id,
            pessoa_id: item.pessoa_id,
            conta_id: contaRateio.conta_id,
            valorBase: item.valorTotal,
            valorDesc: 0.0,
            valorAcresc: 0.0,
            valorTotal: item.valorTotal,
            status: 'Aberto',
            situacao: 'Aberto',
            historico: 'Rateio',
            forma: 'boleto',
         }

         const items = []

         if (item.valorRateio > 0) {
            const busca = lodash.find(this.planoDeContas, {
               id: contaRateio.rateio_plano_id,
            })
            let oItem = {
               DC: 'C',
               tag: 'LF',
               descricao: busca.descricao,
               planoDeConta_id: contaRateio.rateio_plano_id,
               valor: item.valorRateio,
            }
            items.push(oItem)
         }

         if (item.valorBeneficios > 0) {
            const busca = lodash.find(this.planoDeContas, {
               id: contaRateio.beneficios_plano_id,
            })
            let oItem = {
               DC: 'C',
               tag: 'LF',
               descricao: busca.descricao,
               planoDeConta_id: contaRateio.beneficios_plano_id,
               valor: item.valorBeneficios,
            }
            items.push(oItem)
         }

         if (item.valorTaxaAdm > 0) {
            const busca = lodash.find(this.planoDeContas, {
               id: contaRateio.txAdm_plano_id,
            })
            let oItem = {
               DC: 'C',
               tag: 'LF',
               descricao: busca.descricao,
               planoDeConta_id: contaRateio.txAdm_plano_id,
               valor: item.valorTaxaAdm,
            }
            items.push(oItem)
         }

         lanca.items = items

         return resolve(await new LancamentoService().add(lanca, trx, auth))
      })
   }

   async addBoleto(trx, auth, item, contaRateio) {
      return new Promise(async (resolve, reject) => {
         const obj = {
            conta_id: contaRateio.conta_id,
            boleto_nota1: contaRateio.boleto_nota1,
            boleto_nota2: contaRateio.boleto_nota2,
            dVencimento: item.dVencimento2,
            dCompensacao: null,

            nossoNumero: item.nossoNumero,
            lancamento_id: item.lancamento_id,
            pessoa_id: item.pessoa_id,

            valorTotal: item.valorTotal,
            status: 'Aberto',
         }

         return resolve(await ModelBoleto.create(obj, trx ? trx : null))
      })
   }

   async localizarEmailMassa(rateio_id, auth) {
      try {
         const query = await ModelLancamento.query()
            .select([
               'id',
               'pessoa_id',
               'dVencimento',
               'valorTotal',
               'forma',
               'isEmail',
            ])
            .where('rateio_id', rateio_id)
            .with('pessoa', builder => {
               builder.select([
                  'id',
                  'nome',
                  'tipoPessoa',
                  'cpfCnpj',
                  'email',
                  'endRua',
                  'endComplemento',
                  'endBairro',
                  'endCidade',
                  'endEstado',
                  'endCep',
               ])
            })
            .with('boletos', builder => {
               builder.where('status', 'Aberto')
            })
            .fetch()

         const rateio = await Model.findOrFail(rateio_id)

         return { rateio, lancamentos: query }
      } catch (e) {
         throw e
      }
   }

   async gerarPDFs() {}

   async dispararEmailMassa(payload, auth) {
      const rateio_id = payload.rateio_id

      try {
         const lista = payload.lista
         const rateio_id = payload.rateio_id

         for (const key in lista) {
            if (Object.hasOwnProperty.call(lista, key)) {
               const e = lista[key]
               const data = {
                  rateio_id,
                  boleto_id: e.boleto_id,
                  lancamento_id: e.lancamento_id,
                  metodo: 'disparar-email-massa',
               } // Data to be passed to job handle
               const priority = 'normal' // Priority of job, can be low, normal, medium, high or critical
               const attempts = 2 // Number of times to attempt job if it fails
               const remove = true // Should jobs be automatically removed on completion
               const jobFn = job => {
                  // Function to be run on the job before it is saved
                  job.backoff()
               }
               const job = kue.dispatch(Job.key, data, {
                  priority,
                  attempts,
                  remove,
                  jobFn,
               })

               // If you want to wait on the result, you can do this
               const result = await job.result
            }
         }

         await Redis.set('_gerarFinanceiro', 'livre')

         return {
            success: true,
            message: 'Email(s) entregue(s) na fila de execução.',
         }
      } catch (e) {
         await Redis.set('_gerarFinanceiro', 'livre')

         throw e
      }
   }

   async statusEmailMassa(boleto_id) {
      try {
         const log = await ModelEmailLog.query()
            .where('boleto_id', boleto_id)
            .orderBy('created_at', 'desc')
            .fetch()

         return log
      } catch (e) {
         throw e
      }
   }
}

module.exports = Rateio
