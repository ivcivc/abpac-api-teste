'use strict'

// teste2

const lodash = require('lodash')
const Helpers = use('Helpers')

const fs = require('fs')

const ini = require('multi-ini')

const moment = require('moment')

const Database = use('Database')

const ModelBoleto = use('App/Models/Boleto')
const ModelPessoa = use('App/Models/Pessoa')
const ModelRemessa = use('App/Models/Remessa')
const ModelRetorno = use('App/Models/Retorno')
const ModelLancamento = use('App/Models/Lancamento')
const ModelLancamentoStatus = use('App/Models/LancamentoStatus')
const ModelLancamentoConfig = use('App/Models/LancamentoConfig')

const Drive = use('Drive')
const Redis = use('Redis')

class Cnab {
   constructor() {
      this.modeloINI = 'sicoob.ini'
      this.pastaModelo = Helpers.publicPath('ACBr/Sicoob/')
      this.pastaMonitorada = Helpers.tmpPath('ACBr/')
      this.pastaPDF = Helpers.tmpPath('ACBr/pdf/')
      this.arquivoPDF = 'boleto.pdf'
      this.pastaRemessa = Helpers.tmpPath('ACBr/remessa/')
      this.pastaRetorno = Helpers.tmpPath('ACBr/retorno/')
      this.listaIndex = 0 // indice da lista a ser processada.
      this.isExcluirArquivoResposta = false
   }

   async gerarRemessa() {
      return new Promise(async (resolve, reject) => {
         try {
            let pastaRemessa = this.pastaRemessa

            let result = await this.emit(
               `BOLETO.GerarRemessa("${pastaRemessa}")`
            )

            return resolve(result)
         } catch (e) {
            console.error(e)
            let msg = 'Ocorreu um erro na geração do arquivo de remessa.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            resolve({
               success: false,
               message: msg,
            })
         }
      })
   }

   async totalTitulosLista() {
      return new Promise(async (resolve, reject) => {
         try {
            let result = await this.emit(`BOLETO.TotalTitulosLista`)

            let nResult = parseInt(result.message)
            result.result = nResult
            return resolve(result)
         } catch (e) {
            console.error(e)
            let msg =
               'Ocorreu uma falha ao tentar retornar o total de titulos da lista.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            resolve({
               success: false,
               message: msg,
            })
         }
      })
   }

   async gerarBoleto(lista = [], config = null) {
      return new Promise(async (resolve, reject) => {
         try {
            if (lista.length > 1) {
               this.isExcluirArquivoResposta = false
            }
            await this.excluirArquivoResposta(true)
            await this.limparLista()
            if (lista.length === 0)
               return resolve({
                  success: false,
                  message: 'Lista para emissão de boletos está vazia',
               })
            this.listaIndex = 0

            let respostaINI = await this.criarArquivoINI(lista)
            if (!respostaINI.success) {
               return resolve(respostaINI)
            }

            let respostaRemessa = await this.gerarRemessa()
            if (!respostaRemessa.success) {
               return resolve(respostaRemessa)
            }

            let respostaQTD = await this.totalTitulosLista()
            if (!respostaQTD.success) {
               return resolve(respostaQTD)
            }

            /*let respostaPDF = await this.gerarListaPDF(lista, null)
            if (!respostaPDF.success) {
               return resolve(respostaPDF)
            }*/

            /*let ArqPDF = `${lista[0].lancamento_id}.pdf`
            this.arquivoPDF = ArqPDF
            //const cpdf = await this.configurarPastaPDF(null, ArqPDF)
            let resp = await this.gerarPDF(ArqPDF)
            if (!resp.success) {
               return resolve(resp)
            }*/

            return resolve({
               success: true,
               message: 'Operação realizada com sucesso!',
            })
         } catch (e) {
            console.error(e)
            let msg = 'Ocorreu uma falha na função de geração de boleto.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            reject({
               success: false,
               message: msg,
            })
         }
      })
   }

   async criarArquivoINI(lista) {
      return new Promise(async (resolve, reject) => {
         try {
            let content = ini.read(this.pastaModelo + this.modeloINI, {
               encoding: 'utf8',
               keep_quotes: true,
            })

            for (let i in lista) {
               let e = lista[i]
               let xx = i

               let index = parseInt(i) + 1
               let indexObj = `Titulo${index}`

               content[indexObj] = {}

               content[indexObj].NumeroDocumento = e.lancamento_id
               content[indexObj].SeuNumero = e.lancamento_id
               content[indexObj].NossoNumero = e.nossoNumero

               content[indexObj].Carteira = 1

               content[indexObj].ValorDocumento = e.valorTotal
                  .toFixed(2)
                  .replace('.', ',')
               content[indexObj].Vencimento = e.dVencimento

               content[indexObj].CodigoMora = 2
               content[indexObj].ValorMoraJuros = '0,0333'

               let mJuros = moment(e.dVencimento2, 'YYYY-MM-DD')
               let dJuros =
                  mJuros.add(6, 'day').format('YYYY-MM-DD') + 'T00:00:00-03:00'
               let dJurosFormatado = moment(dJuros).format('DD/MM/YYYY')

               content[indexObj].DataMoraJuros = dJurosFormatado //

               content[indexObj].PercentualMulta = 2
               content[indexObj].DataMulta = dJurosFormatado

               content[indexObj].DataDocumento = moment().format('DD/MM/YYYY')
               content[indexObj].DataProcessamento = moment().format(
                  'DD/MM/YYYY'
               )

               content[indexObj].DataAbatimento = ''
               content[indexObj].ValorAbatimento = 0

               content[indexObj].DataDesconto = ''
               content[indexObj].ValorDesconto = 0
               content[indexObj].TipoDesconto2 = 0

               content[indexObj].DiasDeProtesto = 0
               content[indexObj].DataProtesto = ''
               content[indexObj].TipoDiasProtesto = ''

               content[indexObj].DiasDeNegativacao = 0
               content[indexObj].DataNegativacao = 0

               content[indexObj].ValorIOF = 0
               content[indexObj].ValorOutrasDespesas = 0

               content[indexObj].LocalPagamento =
                  'Pagável em qualquer agência bancária mesmo após o vencimento'

               content[indexObj].EspecieDoc = 'DM'
               content[indexObj].EspecieMod = 'R$'

               content[indexObj].Sacado = {}
               content[indexObj].Sacado.NomeSacado = e.pessoa_nome
               content[indexObj].Sacado.CNPJCPF = e.cpfCnpj
               content[indexObj].Sacado.Pessoa = e.cpfCnpj.length === 11 ? 0 : 1

               content[indexObj].Sacado.Logradouro = e.endRua
               content[indexObj].Sacado.Numero = '.'
               content[indexObj].Sacado.Bairro = e.endBairro
               content[indexObj].Sacado.Complemento = e.endComplemento
                  ? e.endComplemento
                  : ''
               content[indexObj].Sacado.Cidade = e.endCidade
               content[indexObj].Sacado.UF = e.endEstado
               content[indexObj].Sacado.CEP = e.endCep
               content[indexObj].Sacado.Email = '' //e.email

               let cMen1 = lodash.isEmpty(e.boleto_nota1) ? '' : e.boleto_nota1
               let cMen2 = lodash.isEmpty(e.boleto_nota2) ? '' : e.boleto_nota2

               let cMes = cMen1
               cMes = lodash.isEmpty(cMen2)
                  ? cMes
                  : lodash.isEmpty(cMen1)
                  ? cMen2
                  : cMen1 + '|' + cMen2

               content[indexObj].Mensagem = cMes
               content[indexObj].Instrucao1 = ''
               content[indexObj].Instrucao2 = ''
               content[indexObj].Aceite = 1
               content[indexObj].OcorrenciaOriginal = 0
               content[indexObj].Parcela = 1
               content[indexObj].TotalParcelas = 1
            }

            ini.write(this.pastaMonitorada + 'boleto.ini', content, {
               encoding: 'utf8',
               keep_quotes: true,
            })

            const configDados = await this.processarArquivoINI()
            if (!configDados.success) {
               return resolve(configDados)
            }

            return resolve({ success: true })
         } catch (e) {
            let msg =
               'Ocorreu uma falha no arquivo de configuração de modelo de boleto.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            resolve({
               success: false,
               message: msg,
            })
         }
      })
   }

   async limparLista() {
      return new Promise(async (resolve, reject) => {
         return this.emit('BOLETO.LimparLista')
            .then(e => resolve(e))
            .catch(e => resolve(e))
      })
   }

   /*async gerarListaPDF(lista, arquivoPDF = null) {
      return new Promise(async (resolve, reject) => {
         try {
            for (let i in lista) {
               let e = lista[i]
               let index = parseInt(i) + 1

               const cpdf = await this.configurarPastaArquivoPDF(
                  null,
                  arquivoPDF
               )
               //const configDados = await this.processarArquivoINI()

               const rGb = await this.emit(`BOLETO.GerarPDFBoleto(${index})`)
               if (!rGb.success) {
                  throw rGb
               }
            }

            resolve(rGb)
         } catch (e) {
            let msg = 'Ocorreu uma falha no modulo de geração de arquivo pdf.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            resolve({ success: false, message: msg })
         }
      })
   }*/

   async gerarPDF(arquivoPDF = null) {
      return new Promise(async (resolve, reject) => {
         try {
            console.log('executando gerarPDF')
            const cpdf = await this.configurarPastaArquivoPDF(null, arquivoPDF)

            let respostaQTD = await this.totalTitulosLista()
            if (!respostaQTD.success) {
               reject({ success: false, message: 'Sem titulos na lista.' })
            }

            let success = { success: true, message: '' }

            for (let i = 0; i <= respostaQTD.result; i++) {
               const rGb = await this.emit(`BOLETO.GerarPDFBoleto(${i})`)
               if (!rGb.success) {
                  throw rGb
               }
            }

            resolve(success)
         } catch (e) {
            let msg = 'Ocorreu uma falha na configuração pasta pdf.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            reject({ success: false, message: msg })
         }
      })
   }

   async processarArquivoINI() {
      return new Promise(async (resolve, reject) => {
         try {
            setTimeout(async () => {
               let arq = this.pastaMonitorada + 'boleto.ini'

               let retorno = await this.emit(`BOLETO.ConfigurarDados("${arq}")`)
               if (!retorno.success) {
                  return resolve(retorno)
               }
               return resolve(retorno)
            }, 80)
         } catch (e) {
            let msg = 'Ocorreu uma falha no arquivo de configuração (INI).'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            reject({ success: false, message: msg })
         }
      })
   }

   async configurarPastaArquivoPDF(pasta = null, arquivo = null) {
      return new Promise(async (resolve, reject) => {
         return resolve(true)
         try {
            if (pasta) {
               this.pastaPDF = pasta
            } else {
               pasta = this.pastaPDF
            }
            if (arquivo) {
               this.arquivoPDF = arquivo
            } else {
               arquivo = this.arquivoPDF
            }
            return resolve(
               await this.emit(
                  `BOLETO.SetDiretorioArquivo("${pasta}", "${arquivo}")`
               )
            )
         } catch (e) {
            let msg = 'Ocorreu uma falha na configuração pasta pdf.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            reject({ success: false, message: msg })
         }
      })
   }

   async emit(cmd) {
      return new Promise(async (resolve, reject) => {
         try {
            const arq = this.pastaMonitorada + 'ent.txt'
            fs.writeFile(
               arq,
               cmd,
               { enconding: 'utf-8', flag: 'a' },
               async err => {
                  if (err)
                     return resolve({
                        success: false,
                        message:
                           'Não foi possivel gravar arquivo de comunicação do servidor de boletos.',
                     })

                  setTimeout(async () => {
                     let resposta = await this.monitorarResposta()
                     if (!resposta.success) {
                        return resolve(resposta)
                     }
                     return resolve(resposta)
                  }, 300)
               }
            )
         } catch (e) {
            let msg =
               'Não foi possivel emitir comando de comunicação do servidor de boletos.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            reject({ success: false, message: msg })
         }
      })
   }

   async monitorarResposta() {
      //Enviando para o console o resultado da leitura
      return new Promise(async (resolve, reject) => {
         try {
            const arq = this.pastaMonitorada + 'sai.txt'
            let mensagem = ''
            /*if (fs.existsSync(this.pastaMonitorada + 'sai.txt')) {
               console.log('arquivo sai.txt localizado.... ')
            }*/
            fs.readFile(arq, 'utf8', async (err, data) => {
               if (err) {
                  return resolve({
                     success: false,
                     message: 'Não possível abrir o arquivos de resposta',
                  })
               } else {
                  let ret = ''
                  if (!this.isExcluirArquivoResposta) {
                     let split = data.split('\r\n')
                     if (split.length === 0) {
                        return resolve({
                           success: false,
                           message:
                              'O arquivo sai.txt não retornou um valor esperado',
                        })
                     }
                     if (split.length === 1) {
                        ret = split[0]
                     } else {
                        if (lodash.isEmpty(split[split.length - 1])) {
                           ret = split[split.length - 2]
                        } else {
                           ret = split[split.length - 1]
                        }
                     }
                  } else {
                     ret = data.substr(0, 4)
                  }

                  if (ret.length > 3) {
                     if (ret.substr(0, 3).toUpperCase() === 'OK:') {
                        mensagem = ret.length > 3 ? ret.substr(4) : 'OK'
                        ret = 'OK:'
                     }
                  }

                  if (ret.length >= 5) {
                     if (ret.substr(0, 5).toUpperCase() === 'ERRO:') {
                        mensagem = ret.length > 5 ? ret.substr(6).trim() : ''
                        ret = 'ERRO:'
                     }
                  }

                  if (ret.toUpperCase() === 'ERRO:') {
                     await this.excluirArquivoResposta()
                     return resolve({
                        success: false,
                        message: mensagem,
                     })
                  }
                  if (ret.toUpperCase().trim() === 'OK:') {
                     await this.excluirArquivoResposta()
                     return resolve({
                        success: true,
                        message: mensagem,
                     })
                  }
                  if (
                     ret.toUpperCase() !== 'OK: ' &&
                     ret.toUpperCase() === 'ERRO:'
                  ) {
                     await this.excluirArquivoResposta()
                  }

                  return resolve({ success: false, message: data })
               }
            })
         } catch (e) {
            let msg = 'Ocorreu uma falha tratamento do arquivo de resposta.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            reject({ success: false, message: msg })
         }
      })
   }

   async excluirArquivoResposta(lForce = false) {
      return new Promise(async (resolve, reject) => {
         try {
            if (!lForce) {
               if (!this.isExcluirArquivoResposta) {
                  return resolve(true)
               }
            }
            if (fs.existsSync(this.pastaMonitorada + 'sai.txt')) {
               fs.unlinkSync(this.pastaMonitorada + 'sai.txt')
               fs.fdatasync(2, callback => {
                  setTimeout(() => {
                     resolve(true)
                  }, 100)
               })
            } else {
               resolve(true)
            }
            //}, 50)
         } catch (ex) {
            console.log('Não foi possivel excluir arquivo sai.txt')
            resolve(false)
         }
      })
   }

   async pdfDownload(arquivo) {
      return new Promise(async (resolve, reject) => {
         try {
            const filePath = this.pastaPDF + 'boleto_' + arquivo + '.pdf'

            const isExist = await Drive.exists(filePath)

            if (isExist) {
               return resolve({ success: true, arquivo: filePath })
            }
         } catch (e) {
            reject(e)
         }
      })
   }

   async pdf(boleto_id) {
      return new Promise(async (resolve, reject) => {
         try {
            const modelBoleto = await ModelBoleto.findOrFail(boleto_id)

            const filePath =
               this.pastaPDF + 'boleto_' + modelBoleto.lancamento_id + '.pdf'

            const isExist = await Drive.exists(filePath)

            if (isExist) {
               return resolve({
                  success: true,
                  arquivo: modelBoleto.lancamento_id,
               })
            }

            if (modelBoleto.status === 'Cancelado') {
               throw { success: false, message: 'Registro cancelado' }
            }

            await modelBoleto.load('lancamento')

            let json = modelBoleto.toJSON()

            const modelPessoa = await ModelPessoa.findOrFail(
               json.lancamento.pessoa_id
            )

            let jsonPessoa = modelPessoa.toJSON()

            json.pessoa = jsonPessoa

            json.NumeroDocumento = json.lancamento_id
            json.SeuNumero = json.lancamento_id

            json.ValorDocumento = json.valorTotal
            json.dVencimento = moment(json.dVencimento).format('DD/MM/YYYY')
            json.dVencimento2 = json.dVencimento

            json.DataDocumento = moment(json.created_at).format('DD/MM/YYYY')
            json.DataProcessamento = moment(json.created_at).format(
               'DD/MM/YYYY'
            )

            json.pessoa_nome = json.pessoa.nome
            json.cpfCnpj = json.pessoa.cpfCnpj
            json.endRua = json.pessoa.endRua
            json.endBairro = json.pessoa.endBairro
            json.endComplemento = json.pessoa.endComplemento
            json.endCidade = json.pessoa.endCidade
            json.endEstado = json.pessoa.endEstado
            json.endCep = json.pessoa.endCep
            json.email = json.pessoa.email

            let lista = []
            lista.push(json)

            const cpdf = await this.configurarPastaArquivoPDF(
               null,
               `${boleto_id}`
            )

            let limparLista = await this.limparLista()
            if (!limparLista.success) {
               return resolve(limparLista)
            }

            let respostaINI = await this.criarArquivoINI(lista)
            if (!respostaINI.success) {
               return resolve(respostaINI)
            }

            /*if (isGerarRemessa) {
               let respostaRemessa = await this.gerarRemessa(lista)
               if (!respostaRemessa.success) {
                  return resolve(respostaRemessa)
               }
            }*/

            let respostaQTD = await this.totalTitulosLista()
            if (!respostaQTD.success) {
               return resolve(respostaQTD)
            }

            const rGb = await this.emit(`BOLETO.GerarPDFBoleto()`)
            if (!rGb.success) {
               return resolve(rGb)
            }

            return resolve({
               success: true,
               arquivo: modelBoleto.lancamento_id,
            })
         } catch (e) {
            let msg = 'Ocorreu uma falha na configuração pasta pdf.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            reject({ success: false, message: msg })
         }
      })
   }

   async listarArquivosRemessa() {
      // Listar de arquivos remessa (.rem) da pasta temporaria
      return new Promise(async (resolve, reject) => {
         try {
            let arr = []
            fs.readdir(this.pastaRemessa, async (err, files) => {
               if (err) throw err
               else {
                  files.forEach(async file => {
                     let stats = fs.statSync(this.pastaRemessa + file)

                     if (file.includes('.rem')) {
                        arr.push({
                           file: file,
                           isMove: false,
                           isUpload: false,
                           stats,
                           dFile: stats.birthtime,
                           isFile: stats.isFile(),
                           isDirectory: stats.isDirectory(),
                           size: stats.size,
                        })
                     }

                     //let exists = await Drive.exists(this.pastaRemessa + file)
                     //console.log(exists)
                  })

                  resolve(arr)
               }
            })
         } catch (e) {
            let msg =
               'Ocorreu uma falha na tentativa de recuperar arquivo de remessa.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            reject({ success: false, message: msg })
         }
      })
   }

   async downloadRemessa(response, payload) {
      // download arquivo de remessa .rem
      let arquivo = null
      let isArquivado = false

      return new Promise(async (resolve, reject) => {
         try {
            arquivo = payload.file
            isArquivado = payload.isArquivado

            let pasta = this.pastaRemessa
            if (isArquivado) pasta = Helpers.tmpPath('ACBr/arquivado/')

            if (await Drive.exists(pasta + arquivo)) {
               this.arquivarArquivoRemessa({ file: arquivo })

               if (!isArquivado) {
                  // Arquivar
                  this.arquivarArquivoRemessa([
                     {
                        file: payload.file,
                        dFile: payload.dFile,
                        size: payload.size,
                        isArquived: true,
                     },
                  ])
               }

               if (response) {
                  return resolve(response.attachment(pasta + arquivo))
               }
               resolve(pasta + arquivo)
            } else {
               throw 'Arquivo de remessa não encontrado.'
            }
         } catch (e) {
            let msg =
               'Ocorreu uma falha na tentativa de download arquivo de remessa.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            reject({ success: false, message: msg })
         }
      })
   }

   async adicionarArquivoRemessa(lista) {
      // adicionar na tabela Remessa, os arquivos de remessa baixados pelo usuario
      let trx = null

      try {
         trx = await Database.beginTransaction()

         for (const key in lista) {
            if (Object.hasOwnProperty.call(lista, key)) {
               const element = lista[key]
               element.isArquived = true
               await ModelRemessa.create(element, trx ? trx : null)
            }
         }

         trx.commit()

         return true
      } catch (e) {
         await trx.rollback()
         throw e
      }
   }

   async arquivarArquivoRemessa(lista) {
      return new Promise(async (resolve, reject) => {
         try {
            for (const key in lista) {
               if (Object.hasOwnProperty.call(lista, key)) {
                  const element = lista[key]
                  const pasta = this.pastaRemessa
                  const pastaArquivado = Helpers.tmpPath('ACBr/arquivado/')

                  if (await Drive.exists(pasta + element.file)) {
                     this.adicionarArquivoRemessa([
                        {
                           file: element.file,
                           isArquived: true,
                           dFile: moment(
                              element.dFile,
                              'YYYY-MM-DD HH:mm:ss Z'
                           ).format('YYYY-MM-DD HH:mm:ss'),
                        },
                     ])
                     await Drive.copy(
                        pasta + element.file,
                        pastaArquivado + element.file
                     )
                     await Drive.delete(pasta + element.file)
                  }
                  /*,*/
               }
            }

            resolve(true)
         } catch (e) {
            let msg =
               'Ocorreu uma falha na tentativa de mover arquivo de remessa.'
            if (lodash.has(e, 'message')) {
               msg = e.message
            }
            reject({ success: false, message: msg })
         }
      })
   }

   async localizarArquivoRemessaArquivado(payload) {
      try {
         let dStart = null
         let dEnd = null

         if (payload.field_value_periodo) {
            dStart = payload.field_value_periodo.start
            dEnd = payload.field_value_periodo.end
         }

         let query = null //.fetch()

         query = await ModelRemessa.query()
            .whereBetween('dFile', [dStart.substr(0, 10), dEnd.substr(0, 10)])
            .fetch()

         return query
      } catch (e) {
         throw e
      }
   }

   async lerArquivoRetorno(request) {
      try {
         if ((await Redis.get('_gerarFinanceiro')) !== 'livre') {
            throw {
               success: false,
               message: 'O servidor está ocupado no momento. Tente mais tarde!',
            }
         }

         await Redis.set('_gerarFinanceiro', 'retorno')

         const arquivo = request.file('upload', {
            types: ['text'],
            size: '5mb',
         })

         await arquivo.move(this.pastaRetorno, {
            name: 'retorno_recebido.txt',
            overwrite: true,
         })

         if (!arquivo.moved()) {
            throw {
               success: false,
               message: 'O servidor retornou falha na leitura do arquivo.',
            }
         }

         let pastaRetorno = this.pastaRetorno

         let result = await this.emit(
            `BOLETO.LerRetorno("${pastaRetorno}","retorno_recebido.txt")`
         )

         let lResult = result.success
         if (!lResult) {
            throw {
               success: false,
               message:
                  'O servidor retornou falha no processamento do arquivo de retorno.',
            }
         }
         console.log('result ', result)

         let content = ini.read(this.pastaRetorno + 'Retorno.ini', {
            encoding: 'latin1',
            keep_quotes: true,
         })

         let nTamanho = Object.keys(content).length
         let arrRetorno = []
         let grupo_id = new Date().getTime()
         for (let i = 1; i <= nTamanho - 3; i++) {
            let o = lodash.cloneDeep(content[`Titulo${i}`])
            o.cedente = content.CEDENTE
            o.banco = content.BANCO
            o.conta = content.CONTA
            o.grupo_id = grupo_id
            arrRetorno.push(o)
         }

         await Drive.delete(this.pastaRetorno + 'Retorno.ini')
         await Drive.delete(this.pastaRetorno + 'retorno_recebido.txt')

         await Redis.set('_gerarFinanceiro', 'livre')

         return { success: true, status: 'server', data: arrRetorno }
      } catch (e) {
         await Redis.set('_gerarFinanceiro', 'livre')
         throw e
      }
   }

   async baixarArquivoRetorno(registro, auth) {
      return new Promise(async (resolve, reject) => {
         let nrErro = null
         let trx = null
         let client_id = registro.client_id ? registro.client_id : null

         try {
            trx = await Database.beginTransaction()

            let lancamento_id = null
            if (registro.SeuNumero) {
               lancamento_id = registro.SeuNumero ? registro.SeuNumero : null
            }
            let oRetorno = {
               lancamento_id,
               sacado: registro.Sacado.Nome,
               cpfCnpj: registro.Sacado.CNPJCPF,
               dVencimento: moment(registro.Vencimento, 'DD/MM/YYYY').format(
                  'YYYY-MM-DD'
               ),
               dOcorrencia: moment(
                  registro.DataOcorrencia,
                  'DD/MM/YYYY'
               ).format('YYYY-MM-DD'),
               dCredito: moment(registro.DataCredito, 'DD/MM/YYYY').format(
                  'YYYY-MM-DD'
               ),
               dProcessamento: moment(
                  registro.DataProcessamento,
                  'DD/MM/YYYY'
               ).format('YYYY-MM-DD'),
               dMoraJuros: moment(registro.DataMoraJuros, 'DD/MM/YYYY').format(
                  'YYYY-MM-DD'
               ),
               nossoNumero: registro.NossoNumero,
               valorAbatimento: parseFloat(
                  registro.ValorAbatimento.replace('.', '')
                     .replace('.', '')
                     .replace(',', '.')
               ),
               valorDesconto: parseFloat(
                  registro.ValorDesconto.replace('.', '')
                     .replace('.', '')
                     .replace(',', '.')
               ),
               valorMoraJuros: parseFloat(
                  registro.ValorMoraJuros.replace('.', '')
                     .replace('.', '')
                     .replace(',', '.')
               ),
               valorIOF: parseFloat(
                  registro.ValorIOF.replace('.', '')
                     .replace('.', '')
                     .replace(',', '.')
               ),
               valorOutrasDespesas: parseFloat(
                  registro.ValorOutrasDespesas.replace('.', '')
                     .replace('.', '')
                     .replace(',', '.')
               ),
               valorOutrosCreditos: parseFloat(
                  registro.ValorOutrosCreditos.replace('.', '')
                     .replace('.', '')
                     .replace(',', '.')
               ),
               valorRecebido: parseFloat(
                  registro.ValorRecebido.replace('.', '')
                     .replace('.', '')
                     .replace(',', '.')
               ),
               codTipoOcorrencia: registro.CodTipoOcorrencia,
               descricaoTipoOcorrencia: registro.DescricaoTipoOcorrencia,
               motivoRejeicao1: registro.MotivoRejeicao1,
               banco: registro.banco.Numero,
               conta: registro.conta.Conta,
               contaDigito: registro.conta.DigitoConta,
               agencia: registro.conta.Agencia,
               agenciaDigito: registro.conta.DigitoAgencia,
               cedente: registro.CodigoCedente,
               grupo_id: registro.grupo_id,
               situacao: lancamento_id ? 'Liquidado' : 'Não localizado',
            }

            let modelRetorno = null
            let retorno_id = null

            const modelLancamentoConfig = await ModelLancamentoConfig.pick(1)
            let arrConfig = modelLancamentoConfig.toJSON()
            let oConfig = null
            if (arrConfig.length > 0) {
               oConfig = arrConfig[0]
            }
            console.log(oConfig)

            const gravarRetorno = async oRetorno => {
               modelRetorno = await ModelRetorno.create(oRetorno)
               retorno_id = modelRetorno.id
            }

            let oLancamento = {
               dRecebimento: oRetorno.dCredito,
               valorCompensadoAcresc: 0.0,
               valorCompensadoDesc: 0.0,
               valorCompensadoPrej: 0.0,
               valorCompensado: 0.0,
               forma: 'boleto',
               situacao: 'Compensado',
               documentoNr: 'Arquivo retorno',
               documento: 'Boleto',
            }

            if (!lancamento_id) {
               nrErro = -100
               await gravarRetorno(oRetorno)
               let retorno = modelRetorno.toJSON()
               retorno.client_id = client_id
               throw {
                  success: false,
                  message: 'Não localizado',
                  data: retorno,
               }
            }

            let modelLancamento = await ModelLancamento.find(lancamento_id)
            if (!modelLancamento) {
               nrErro = -100
               await gravarRetorno(oRetorno)
               let retorno = modelRetorno.toJSON()
               retorno.client_id = client_id
               throw {
                  success: false,
                  message: 'Não localizado',
                  data: retorno,
               }
            }
            if (modelLancamento.situacao === 'Compensado') {
               nrErro = -100
               oRetorno.situacao = 'Não liquidado (duplicidade)'
               await gravarRetorno(oRetorno)
               let retorno = modelRetorno.toJSON()
               retorno.client_id = client_id
               throw {
                  success: false,
                  message: `Não liquidado. A conta nr.${lancamento_id} já foi liquidada`,
                  data: retorno,
               }
            }

            let arrItems = []
            if (oRetorno.valorRecebido === modelLancamento.valorTotal) {
               oLancamento.valorCompensado = modelLancamento.valorTotal
            } else {
               if (oRetorno.valorRecebido > modelLancamento.valorTotal) {
                  oLancamento.valorCompensado = oRetorno.valorRecebido
                  let valor =
                     oRetorno.valorRecebido - modelLancamento.valorTotal
                  oLancamento.valorCompensadoAcresc = valor
                  arrItems.push({
                     DC: 'C',
                     tag: 'QA',
                     descricao: 'Acréscimo na compensação boleto',
                     planoDeConta_id: oConfig.receber_plano_id_acresc,
                     valor: valor,
                  })
               }
               if (oRetorno.valorRecebido < modelLancamento.valorTotal) {
                  let valor =
                     modelLancamento.valorTotal - oRetorno.valorRecebido
                  oLancamento.valorCompensadoDesc = valor
                  oLancamento.valorCompensado =
                     modelLancamento.valorTotal - valor
                  arrItems.push({
                     DC: 'D',
                     tag: 'QD',
                     descricao: 'Desconto na compensação boleto',
                     planoDeConta_id: oConfig.receber_plano_id_desc,
                     valor: valor,
                  })
               }
            }
            modelLancamento.merge(oLancamento)

            if (arrItems.length > 0) {
               await modelLancamento
                  .items()
                  .createMany(arrItems, trx ? trx : null)
            }

            const status = {
               lancamento_id: modelLancamento.id,
               user_id: auth.user.id,
               motivo: 'Alteração de status',
               status: oLancamento.situacao,
            }
            await ModelLancamentoStatus.create(status, trx ? trx : null)

            await modelLancamento.save(trx ? trx : null)

            await trx.commit()

            await gravarRetorno(oRetorno)

            let retorno = modelRetorno.toJSON()
            retorno.client_id = client_id

            return resolve({
               success: true,
               message: 'Processado com sucesso.',
               data: retorno,
            })
         } catch (e) {
            await trx.rollback()
            reject(e)
         }
      })
   }
}

module.exports = Cnab
