'use strict'

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const OcorrenciaService = use('App/Services/Ocorrencia')
const OcorrenciaStatus = use('App/Models/OcorrenciaStatus')


class OcorrenciaStatusController {

   async store ({ request, response, auth }) {
      const dados = request.all()

      try {

        const OcorrenciaStatus = await new OcorrenciaService().addStatus(dados, null, auth)

        return OcorrenciaStatus
      } catch (error) {
        console.log(error)
        return response
          .status(400)
          .send('Não foi possível Adicionar o status do Ocorrencia.')
      }
    }

    async show ({ params, response }) {
      try {
        const status = OcorrenciaStatus.query()
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
          .send('Não foi possível exibir um status do Ocorrencia solicitado.')
      }
    }

}

module.exports = OcorrenciaStatusController
