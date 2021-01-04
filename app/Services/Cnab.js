'use strict'
const lodash = require('lodash')
const Helpers = use('Helpers')

const fs = require('fs')

const ini = require('multi-ini')

const moment = require('moment')

const ModelBoleto = use('App/Models/Boleto')
const ModelPessoa = use('App/Models/Pessoa')

const Drive = use('Drive')

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
               let dJuros = mJuros.add(5, 'day').format('DD/MM/YYYY')

               content[indexObj].DataMoraJuros = dJuros //

               content[indexObj].PercentualMulta = 2

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

                  return resolve({ success: true, message: data })
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
}

module.exports = Cnab
