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
               //throw respostaINI
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
            /*throw {
               success: false,
               message: msg,
            }*/
         }
      })
   }

   tirarCaracteresEspeciais(s, forcarString = false) {
      if (lodash.isEmpty(s)) {
         return s
      }

      let arr = s.match(/[0-9a-zA-ZçÇéÉâÂãÃáÁêÊôÔèÈàÀõÕ-]+/g)

      let retorno = ''

      if (lodash.isArray(arr)) {
         for (let i = 0; i <= arr.length - 1; i++) {
            if (i > 0) {
               retorno += ' '
            }
            retorno = retorno + arr[i]
         }
      }

      if (forcarString) {
         if (lodash.isEmpty(retorno)) {
            retorno = 'NF'
         }
      }
      return retorno
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
               content[indexObj].ValorMoraJuros = 1 //'333'

               let mJuros = moment(e.dVencimento2, 'YYYY-MM-DD')
               let dJuros =
                  mJuros.add(6, 'day').format('YYYY-MM-DD') + 'T00:00:00-03:00'
               let dJurosFormatado = moment(dJuros).format('DD/MM/YYYY')

               content[indexObj].DataMoraJuros = dJurosFormatado //

               content[indexObj].PercentualMulta = 2
               content[indexObj].DataMulta = dJurosFormatado

               content[indexObj].DataDocumento = moment().format('DD/MM/YYYY')
               content[indexObj].DataProcessamento =
                  moment().format('DD/MM/YYYY')

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

               content[indexObj].Sacado.Logradouro =
                  this.tirarCaracteresEspeciais(e.endRua, true)
               content[indexObj].Sacado.Numero = '.'
               content[indexObj].Sacado.Bairro = this.tirarCaracteresEspeciais(
                  e.endBairro,
                  true
               )
               content[indexObj].Sacado.Complemento =
                  this.tirarCaracteresEspeciais(e.endComplemento, true)
                     ? this.tirarCaracteresEspeciais(e.endComplemento, true)
                     : ''
               content[indexObj].Sacado.Cidade = this.tirarCaracteresEspeciais(
                  e.endCidade,
                  true
               )
               content[indexObj].Sacado.UF = this.tirarCaracteresEspeciais(
                  e.endEstado,
                  true
               )
               content[indexObj].Sacado.CEP = this.tirarCaracteresEspeciais(
                  e.endCep,
                  true
               )
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
            console.log(e)
            resolve({
               success: false,
               message: msg,
            })
            //throw e
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

   async aguardar(n) {
      return new Promise(async (resolve, reject) => {
         setTimeout(() => {
            resolve(true)
         }, n)
      })
   }

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

            for (let i = 0; i <= respostaQTD.result - 1; i++) {
               await this.aguardar(2000)
               const rGb = await this.emit(`BOLETO.GerarPDFBoleto(${i})`)
               if (!rGb.success) {
                  throw rGb
               }
            }
            console.log('gerarPDF (cnab.js). Resolve.')
            resolve(success)
         } catch (e) {
            console.log('error (catch) gerarPDF - cnab.js')
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

            console.log(`procurando o arquivo ${filePath}`)

            const isExist = await Drive.exists(filePath)

            if (isExist) {
               return resolve({ success: true, arquivo: filePath })
            } else {
               console.log(
                  'Arquivo (pdfDownload(cnab) não localizado ',
                  arquivo
               )
               throw {
                  success: false,
                  arquivo: null,
                  message: 'Arquivo não localizado',
               }
            }
         } catch (e) {
            reject(e)
         }
      })
   }

   async pdfBase64(arquivo) {
      return new Promise(async (resolve, reject) => {
         try {
            const filePath = this.pastaPDF + 'boleto_' + arquivo + '.pdf'

            const isExist = await Drive.exists(filePath)

            if (isExist) {
               fs.readFile(filePath, { encoding: 'base64' }, (err, data) => {
                  if (err) {
                     throw {
                        success: false,
                        arquivo: null,
                        message: 'Não foi possível abrir o arquivo PDF',
                     }
                  }
                  //console.log(`data:PDF;base64,${data}`);
                  return resolve({ success: true, arquivo: data })
               })
            } else {
               console.log(
                  'Arquivo (pdfDownload(cnab) não localizado ',
                  arquivo
               )
               throw {
                  success: false,
                  arquivo: null,
                  message: 'Arquivo PDF não localizado',
               }
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
            json.dVencimento = moment(json.dVencimento, 'YYYY-MM-DD').format(
               'DD/MM/YYYY'
            )
            json.dVencimento2 = moment(json.dVencimento, 'DD/MM/YYYY').format(
               'YYYY-MM-DD'
            )

            json.DataDocumento = moment(json.created_at).format('DD/MM/YYYY')
            json.DataProcessamento = moment(json.created_at).format(
               'DD/MM/YYYY'
            )

            json.pessoa_nome = json.pessoa.nome
            json.cpfCnpj = json.pessoa.cpfCnpj
            json.endRua = this.tirarCaracteresEspeciais(
               json.pessoa.endRua,
               true
            )
            json.endBairro = this.tirarCaracteresEspeciais(
               json.pessoa.endBairro,
               true
            )
            json.endComplemento = this.tirarCaracteresEspeciais(
               json.pessoa.endComplemento,
               true
            )
            json.endCidade = this.tirarCaracteresEspeciais(
               json.pessoa.endCidade,
               true
            )
            json.endEstado = this.tirarCaracteresEspeciais(
               json.pessoa.endEstado,
               true
            )
            json.endCep = this.tirarCaracteresEspeciais(
               json.pessoa.endCep,
               true
            )
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
      let retorno = null
      let success = true

      return new Promise(async (resolve, reject) => {
         try {
            const arquivo = request.file('upload', {
               types: ['text'],
               size: '5mb',
            })

            //console.log('arquivo ', arquivo)
            const ano = new Date().getFullYear()
            const mes = new Date().getMonth() + 1
            const timestamp = new Date().getTime()

            const novoArquivo = `${ano}_${mes}_${timestamp}.ret`

            await arquivo.move(this.pastaRetorno, {
               name: novoArquivo,
               overwrite: true,
            })

            if (!arquivo.moved()) {
               throw {
                  success: false,
                  message: 'O servidor retornou falha na leitura do arquivo.',
               }
            }

            let isHeaderArquivo = false
            let isHeaderLote = false

            let pastaRetorno = this.pastaRetorno
            let headerArquivo = {}
            let headerLote = {}
            let detalhe = {}
            let isErro = false
            let msg = ''

            let TU = 0
            let isEntrarDetalhe = false
            let isLoop = false

            let grupo_id = new Date().getTime()

            let detalhes = []
            let header = {}

            const excluirArquivo = async () => {
               try {
                  await Drive.delete(pastaRetorno + novoArquivo)
               } catch (e) {}
            }

            const arquivarArquivo = async () => {
               try {
                  await Drive.move(
                     pastaRetorno + novoArquivo,
                     pastaRetorno + 'arquivado/' + novoArquivo
                  )
               } catch (e) {}
            }

            fs.readFile(pastaRetorno + novoArquivo, 'utf-8', (err, data) => {
               if (err) {
                  throw err
               }
               let linhas = data.split(/\r?\n/)

               linhas.forEach(linha => {
                  if (!isHeaderArquivo && !isLoop) {
                     headerArquivo.banco = linha.toString().substr(0, 3)
                     headerArquivo.cnpj = linha.toString().substr(18, 14)
                     headerArquivo.contaCorrente = linha
                        .toString()
                        .substr(58, 12)
                     headerArquivo.contaCorrenteDV = linha
                        .toString()
                        .substr(70, 1)
                     headerArquivo.empresa = linha.toString().substr(72, 30)
                     headerArquivo.retorno = linha.toString().substr(142, 1) // 2 = retorno
                     headerArquivo.dataGeracao = moment(
                        linha.toString().substr(143, 8),
                        'DDMMYYYY'
                     ).format('YYYY-MM-DD')
                     headerArquivo.horaGeracao = linha.toString().substr(151, 6)
                     headerArquivo.versaoLayout = linha
                        .toString()
                        .substr(163, 3) // versao layout arq "081"

                     isHeaderArquivo = true
                     isLoop = true
                  }

                  if (isHeaderArquivo && !isHeaderLote && !isLoop) {
                     headerLote.banco = linha.toString().substr(0, 3)
                     headerLote.operacao = linha.toString().substr(8, 1) // TIPO OPERAÇÃO === T
                     if (headerLote.operacao !== 'T') {
                        isErro = true
                        msg = 'Arquivo de retorno não validado'
                     }
                     headerLote.empresa = {}
                     headerLote.empresa.cnpj = linha.toString().substr(18, 15)
                     headerLote.empresa.convenio = linha
                        .toString()
                        .substr(33, 20)
                     headerLote.empresa.agencia = linha.toString().substr(53, 5)
                     headerLote.empresa.agenciaDV = linha
                        .toString()
                        .substr(58, 1)
                     headerLote.empresa.conta = linha.toString().substr(59, 12)
                     headerLote.empresa.contaDV = linha.toString().substr(71, 1)
                     headerLote.empresa.nome = linha.toString().substr(73, 30)
                     headerLote.numeroControle = linha.toString().substr(183, 8)
                     headerLote.dataGravacao = moment(
                        linha.toString().substr(191, 8),
                        'DDMMYYYY'
                     ).format('YYYY-MM-DD')

                     headerLote.dataCredito = null //parseInt(headerLote.data) === 0 ? null : moment(linha.toString().substr(199, 8) ,'DDMMYYYY').format('YYYY-MM-DD')

                     isHeaderLote = true
                     TU = 0
                     isEntrarDetalhe = true

                     header = headerLote
                     header.dataGeracao = headerArquivo.dataGeracao
                     header.horaGeracao = headerArquivo.horaGeracao

                     isLoop = true
                  }

                  // Seguimento T
                  if (
                     isHeaderArquivo &&
                     isHeaderLote &&
                     isEntrarDetalhe &&
                     !isLoop &&
                     TU === 0 &&
                     linha.toString().substr(13, 1) === 'T'
                  ) {
                     detalhe = {}
                     // Seguimento T
                     detalhe.banco = linha.toString().substr(0, 3)
                     detalhe.segmento = linha.toString().substr(13, 1)
                     if (detalhe.segmento !== 'T') {
                        isErro = true
                        msg = 'Erro no segmento T'
                     }
                     detalhe.codigoMovimento = linha.toString().substr(15, 2)

                     detalhe.nossoNumero = parseInt(
                        linha.toString().substr(37, 10)
                     ).toString()
                     detalhe.parcela = linha.toString().substr(47, 2)
                     detalhe.modalidade = linha.toString().substr(49, 2)
                     detalhe.tipoFormulario = linha.toString().substr(51, 1)

                     detalhe.numeroDocumento = parseInt(
                        linha.toString().substr(58, 15)
                     ).toString()

                     detalhe.dataVencimento = moment(
                        linha.toString().substr(73, 8),
                        'DDMMYYYY'
                     ).format('YYYY-MM-DD')

                     let valorTitulo = linha.toString().substr(81, 15)
                     detalhe.valorTitulo = parseFloat(
                        valorTitulo.substring(0, 13) +
                           '.' +
                           valorTitulo.substr(13, 2)
                     )

                     detalhe.pagador = {}
                     detalhe.pagador.cpfCnpjTipo = linha
                        .toString()
                        .substr(132, 1)
                     detalhe.pagador.cpfCnpj = linha.toString().substr(133, 15)
                     detalhe.pagador.nome = linha
                        .toString()
                        .substr(148, 40)
                        .trim()
                     detalhe.numeroContrato = linha.toString().substr(188, 10)
                     let valorTarifa = linha.toString().substr(198, 15)
                     detalhe.valorTarifa = parseFloat(
                        valorTarifa.substring(0, 13) +
                           '.' +
                           valorTarifa.substr(13, 2)
                     )

                     detalhe.motivoOcorrencia = linha.toString().substr(213, 10)

                     TU = 1
                     isLoop = true
                  }

                  // Seguimento U
                  if (
                     isHeaderArquivo &&
                     isHeaderLote &&
                     isEntrarDetalhe &&
                     !isLoop &&
                     TU === 1 &&
                     linha.toString().substr(13, 1) === 'U'
                  ) {
                     // Seguimento U
                     detalhe.banco = linha.toString().substr(0, 3)
                     detalhe.segmento = linha.toString().substr(13, 1)
                     if (detalhe.segmento !== 'U') {
                        isErro = true
                        msg = 'Erro no segmento U'
                     }

                     let retCodigoRetorno = this.retTipoRetorno(
                        linha.toString().substr(15, 2)
                     )
                     detalhe.codigoMovimentoRetorno = retCodigoRetorno.codigo
                     detalhe.historico = retCodigoRetorno.historico

                     let acrescimo = linha.toString().substr(17, 15)
                     detalhe.acrescimo = parseFloat(
                        acrescimo.substring(0, 13) +
                           '.' +
                           acrescimo.substr(13, 2)
                     )
                     let desconto = linha.toString().substr(32, 15)
                     detalhe.desconto = parseFloat(
                        desconto.substring(0, 13) + '.' + desconto.substr(13, 2)
                     )
                     let abatimento = linha.toString().substr(47, 15)
                     detalhe.abatimento = parseFloat(
                        abatimento.substring(0, 13) +
                           '.' +
                           abatimento.substr(13, 2)
                     )
                     let iof = linha.toString().substr(62, 15)
                     detalhe.iof = parseFloat(
                        iof.substring(0, 13) + '.' + iof.substr(13, 2)
                     )
                     let valorPago = linha.toString().substr(77, 15)
                     detalhe.valorPago = parseFloat(
                        valorPago.substring(0, 13) +
                           '.' +
                           valorPago.substr(13, 2)
                     )
                     let valorLiquido = linha.toString().substr(92, 15)
                     detalhe.valorLiquido = parseFloat(
                        valorLiquido.substring(0, 13) +
                           '.' +
                           valorLiquido.substr(13, 2)
                     )
                     let outrasDespesas = linha.toString().substr(107, 15)
                     detalhe.outrasDespesas = parseFloat(
                        outrasDespesas.substring(0, 13) +
                           '.' +
                           outrasDespesas.substr(13, 2)
                     )
                     let outrosCreditos = linha.toString().substr(122, 15)
                     detalhe.outrosCreditos = parseFloat(
                        outrosCreditos.substring(0, 13) +
                           '.' +
                           outrosCreditos.substr(13, 2)
                     )
                     detalhe.dataOcorrencia = moment(
                        linha.toString().substr(137, 8),
                        'DDMMYYYY'
                     ).format('YYYY-MM-DD')
                     let dataCredito = linha.toString().substr(145, 8)
                     if (parseInt(dataCredito) === 0) {
                        dataCredito = null
                     } else {
                        detalhe.dataCredito = moment(
                           linha.toString().substr(145, 8),
                           'DDMMYYYY'
                        ).format('YYYY-MM-DD')
                     }

                     /*detalhe.pagador.dataOcorrencia = moment( linha.toString().substr(157, 8),'DDMMYYYY').format('YYYY-MM-DD')
                  detalhe.pagador.valorOcorrencia = linha
                     .toString()
                     .substr(165, 15)*/

                     TU = 0

                     detalhe.header = header
                     detalhe.grupo_id = grupo_id

                     detalhes.push(detalhe)

                     isLoop = true
                  }

                  isLoop = false
               })

               if (isErro) {
                  reject({ success: false, message: msg, data: detalhes })
                  return arquivarArquivo()
               }

               //this.baixarArquivoRetorno(detalhes[3], null)

               /*retorno = headerArquivo
               retorno.dataGravacao = headerLote.dataGravacao
               retorno.detalhes = detalhes
               retorno.grupo_id = grupo_id*/

               resolve({ success, status: 'server', data: detalhes })

               arquivarArquivo()
            })

            //await Drive.delete(this.pastaRetorno + 'Retorno.ini')
            //await Drive.delete(this.pastaRetorno + 'retorno_recebido.txt')
         } catch (e) {
            reject({ success: false, message: e.message })
            arquivarArquivo()
         }
      })
   }

   async lerArquivoRetornoVersaoACBr(request) {
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

         console.log('arquivo ', arquivo)

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

         console.log('content ', content)

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
         let client_id = registro.client_id

         try {
            trx = await Database.beginTransaction()

            let nossoNumero = parseInt(registro.nossoNumero).toString()
            let numeroDocumento = parseInt(registro.numeroDocumento).toString()

            let lancamento_id = null

            let cSituacao = 'NÃO LOCALIZADO'

            let oRetorno = {
               lancamento_id: null,
               sacado: registro.pagador.nome.trim(),
               cpfCnpj: registro.pagador.cpfCnpj,
               dVencimento: registro.dataVencimento,
               dOcorrencia: registro.dataOcorrencia,
               dCredito: registro.dataCredito,
               dProcessamento: registro.header.dataGravacao,
               dMoraJuros: null,
               //numeroDocumento: numeroDocumento,
               nossoNumero: nossoNumero,
               valorAbatimento: registro.abatimento,
               valorDesconto: registro.desconto,
               valorMoraJuros: registro.acrescimo,
               valorIOF: registro.iof,
               valorOutrasDespesas: registro.outrasDespesas,
               valorOutrosCreditos: registro.outrosCreditos,
               valorRecebido: registro.valorPago,

               codTipoOcorrencia: registro.codigoMovimentoRetorno,
               descricaoTipoOcorrencia: registro.historico,
               motivoRejeicao1: '',
               banco: registro.banco,
               conta: parseInt(registro.header.empresa.conta).toString(),
               contaDigito: registro.header.empresa.contaDV,
               agencia: parseInt(registro.header.empresa.agencia).toString(),
               agenciaDigito: registro.header.empresa.agenciaDV,
               cedente: null,
               grupo_id: registro.grupo_id,
               situacao: cSituacao,
            }

            let modelRetorno = null
            let retorno_id = null

            const modelLancamentoConfig = await ModelLancamentoConfig.pick(1)
            let arrConfig = modelLancamentoConfig.toJSON()
            let oConfig = null
            if (arrConfig.length > 0) {
               oConfig = arrConfig[0]
            }

            let modelLancamento = null
            const codTipoOcorrencia = oRetorno.codTipoOcorrencia

            const modelBoleto = await ModelBoleto.findBy(
               'nossoNumero',
               registro.nossoNumero
            )

            let oLancamento = {
               forma: 'boleto',
               //situacao: 'Compensado',
               documentoNr: 'Arquivo retorno',
               documento: 'Boleto',
            }

            let arrLancamentoItems = []

            if (modelBoleto) {
               //modelLancamento = await modelBoleto.lancamento().fetch()
               modelLancamento = await ModelLancamento.find(
                  modelBoleto.lancamento_id
               )

               oRetorno.lancamento_id = modelLancamento.id

               switch (codTipoOcorrencia) {
                  case '06':
                     // Compensado

                     if (modelBoleto.status !== 'Compensado') {
                        modelBoleto.dCompensacao = oRetorno.dCredito
                        modelBoleto.status = 'Compensado'

                        cSituacao = 'Compensado'
                        if (modelLancamento) {
                           lancamento_id = modelLancamento.id
                           oLancamento.dRecebimento = oRetorno.dCredito
                           oLancamento.valorCompensadoAcresc =
                              oRetorno.valorMoraJuros +
                              oRetorno.valorOutrosCreditos
                           oLancamento.valorCompensadoDesc =
                              oRetorno.valorAbatimento +
                              oRetorno.valorDesconto +
                              oRetorno.valorOutrasDespesas

                           oLancamento.valorCompensado = oRetorno.valorRecebido //recebido
                           oLancamento.situacao = 'Compensado'

                           // Lançamentos de acrescimos e descontos
                           if (
                              oRetorno.valorRecebido >
                              modelLancamento.valorTotal
                           ) {
                              oLancamento.valorCompensado =
                                 oRetorno.valorRecebido
                              let valor =
                                 oRetorno.valorRecebido -
                                 modelLancamento.valorTotal
                              oLancamento.valorCompensadoAcresc = valor
                              arrLancamentoItems.push({
                                 DC: 'C',
                                 tag: 'QA',
                                 descricao: 'Acréscimo na compensação boleto',
                                 planoDeConta_id:
                                    oConfig.receber_plano_id_acresc,
                                 valor: valor,
                              })
                           }
                           if (
                              oRetorno.valorRecebido <
                              modelLancamento.valorTotal
                           ) {
                              let valor =
                                 modelLancamento.valorTotal -
                                 oRetorno.valorRecebido
                              oLancamento.valorCompensadoDesc = valor
                              oLancamento.valorCompensado =
                                 modelLancamento.valorTotal - valor
                              arrLancamentoItems.push({
                                 DC: 'D',
                                 tag: 'QD',
                                 descricao: 'Desconto na compensação boleto',
                                 planoDeConta_id: oConfig.receber_plano_id_desc,
                                 valor: valor,
                              })
                           }

                           modelLancamento.merge(oLancamento)

                           if (arrLancamentoItems.length > 0) {
                              await modelLancamento
                                 .items()
                                 .createMany(
                                    arrLancamentoItems,
                                    trx ? trx : null
                                 )
                           }

                           await modelLancamento.save(trx ? trx : null)

                           const status = {
                              lancamento_id: modelLancamento.id,
                              user_id: auth.user.id,
                              motivo: 'Alteração de status',
                              status: oLancamento.situacao,
                           }
                           await ModelLancamentoStatus.create(
                              status,
                              trx ? trx : null
                           )
                        }
                     } else {
                        cSituacao = 'Não liquidado (duplicidade)'
                     }
                     break

                  case '09':
                     if (modelBoleto.status !== 'Cancelado') {
                        modelBoleto.status = 'Cancelado'
                        cSituacao = 'Cancelado'
                     }
                     break

                  default:
                     cSituacao = registro.historico
               }

               await modelBoleto.save(trx ? trx : null)
            } else {
               nrErro = -100 /// boleto não localizado
            }

            oRetorno.lancamento_id = lancamento_id

            const gravarRetorno = async oRetorno => {
               modelRetorno = await ModelRetorno.create(
                  oRetorno,
                  trx ? trx : null
               )
               retorno_id = modelRetorno.id
            }

            oRetorno.situacao = cSituacao
            await gravarRetorno(oRetorno)
            //let retorno = modelRetorno.toJSON()

            await trx.commit()
            //await trx.rollback()

            registro.sucesso = true
            if (nrErro < 0) {
               registro.sucesso = false
            }
            registro.situacao = cSituacao

            return resolve({
               success: true,
               message: 'Processado com sucesso.',
               data: registro,
            })
         } catch (e) {
            registro.sucesso = false
            await trx.rollback()
            reject({ success: false, message: e.message, data: registro })
         }
      })
   }

   retTipoRetorno(codigoMovimentoRetorno) {
      let historico = ''

      switch (codigoMovimentoRetorno) {
         case '02':
            historico = '02-ENTRADA CONFIRMADA'
            break
         case '09':
            historico = '09-BAIXA DE TÍTULO'
            break
         case '44':
            historico = '44-TITULO PAGO COM CHEQUE DEVOLVIDO'
            break
         case '45':
            historico = '45-TITULO PAGO COM CHEQUE COMPENSADO'
            break
         case '06':
            historico = '06-LIQUIDAÇÃO NORMAL'
            break

         default:
            historico = codigoMovimentoRetorno
      }

      if (historico.length > 30) {
         historico = historico.substring(0, 30)
      }

      return { codigo: codigoMovimentoRetorno, historico }
   }

   async baixarArquivoRetornoVersoACBr(registro, auth) {
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
            let cSituacao = 'Não localizado'

            cSituacao = lancamento_id ? 'Liquidado' : 'Não localizado'

            if (registro.CodTipoOcorrencia === 'toRetornoBaixaSimples') {
               cSituacao = lancamento_id ? 'Baixado' : 'Não localizado'
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
               situacao: cSituacao,
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

            if (registro.CodTipoOcorrencia === 'toRetornoBaixaSimples') {
               await ModelBoleto.query()
                  .where('lancamento_id', modelLancamento.id)
                  .where('status', 'Aberto')
                  .transacting(trx ? trx : null)
                  .update({ status: 'Cancelado' })

               await trx.commit()

               await gravarRetorno(oRetorno)

               let retorno = modelRetorno.toJSON()
               retorno.client_id = client_id

               return resolve({
                  success: true,
                  message: 'Processado com sucesso.',
                  data: retorno,
               })
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

            await ModelBoleto.query()
               .where('lancamento_id', modelLancamento.id)
               .where('status', 'Ativo')
               .transacting(trx ? trx : null)
               .update({ status: 'Compensado' })

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
