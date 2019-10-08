'use strict'

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */

const EquipamentoService = use('App/Services/Equipamento')
const EquipamentoStatus = use('App/Models/EquipamentoStatus')

class EquipamentoStatusController {

   async store ({ request, response, auth }) {
      const dados = request.all()

      try {

        const equipamentoStatus = await new EquipamentoService().addStatus(dados, null, auth)

        return equipamentoStatus
      } catch (error) {
        console.log(error)
        return response
          .status(400)
          .send('Não foi possível Adicionar o status do Equipamento.')
      }
    }

    async show ({ params, response }) {
      try {
        const status = EquipamentoStatus.query()
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
          .send('Não foi possível exibir um status do Equipamento solicitado.')
      }
    }

}

module.exports = EquipamentoStatusController
