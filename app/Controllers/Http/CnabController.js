'use strict'
//import { Layout, Remessa, RemessaFile } from 'nodenab'
const CnabService = use('App/Services/Cnab')

class CnabController {
   /*async arquivarArquivoRemessa({ request, response }) {
      try {
         const lista = request.all()
         const model = await new CnabService().arquivarArquivoRemessa(lista)

         response
            .status(200)
            .send({ type: model, message: 'Operação finalizada com sucesso' })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }*/

   async listarArquivosRemessa({ response }) {
      try {
         const model = await new CnabService().listarArquivosRemessa()

         response.status(200).send({ type: true, data: model })
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async downloadRemessa({ request, response }) {
      try {
         const payload = request.all()

         const model = await new CnabService().downloadRemessa(
            response,
            payload
         )
      } catch (error) {
         console.log(error)
         response.status(400).send({
            code: error.code,
            message: error.message,
            name: error.name,
         })
      }
   }

   async localizarArquivoRemessaArquivado({ request, response }) {
      const payload = request.all()

      try {
         const query = await new CnabService().localizarArquivoRemessaArquivado(
            payload
         )

         response.status(200).send(query)
      } catch (error) {
         console.log(error)
         response.status(400).send(error)
      }
   }
}

module.exports = CnabController
