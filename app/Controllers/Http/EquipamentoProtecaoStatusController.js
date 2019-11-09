'use strict'

const EquipamentoProtecaoService = use('App/Services/EquipamentoProtecao')
const EquipamentoProtecaoStatus = use('App/Models/EquipamentoProtecaoStatus')


class EquipamentoProtecaoStatusController {

   async store ({ request, response, auth }) {
      const dados = request.all()

      try {

        const equipamentoProtecaoStatus = await new EquipamentoProtecaoService().addStatus(dados, null, auth)

        return equipamentoProtecaoStatus
      } catch (error) {
        console.log(error)
        return response
          .status(400)
          .send('Não foi possível Adicionar o status do Bloqueador/Localizador.')
      }
    }

    async show ({ params, response }) {
      try {
        const status = EquipamentoProtecaoStatus.query()
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
          .send('Não foi possível exibir um status do Bloqueador/Localizador solicitado.')
      }
    }

}

module.exports = EquipamentoProtecaoStatusController
