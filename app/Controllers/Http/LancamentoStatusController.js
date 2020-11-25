'use strict'

const Model = use('App/Models/LancamentoStatus')

class LancamentoStatusController {
   async show({ params, response }) {
      try {
         const status = LancamentoStatusController.query()
         status.where('id', '=', params.id)

         const o = await status.fetch()
         if (o.rows.length === 0) {
            return response.status(400).send('status não localizado.')
         }
         return o
         // return transform.collection(o, statusTransformer)
      } catch (error) {
         console.log(error)
         return response
            .status(400)
            .send('Não foi possível exibir o status do Lançamento solicitado.')
      }
   }
}

module.exports = LancamentoStatusController
