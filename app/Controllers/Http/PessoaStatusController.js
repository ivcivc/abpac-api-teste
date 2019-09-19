'use strict'
const PessoaService = use('App/Services/Pessoa')

const PessoaStatus = use('App/Models/PessoaStatus')

class PessoaStatusController {

   async store ({ request, response, auth }) {
      const dados = request.all()

      try {

        const pessoaStatus = await new PessoaService().addStatus(dados, null, auth)

        return pessoaStatus
      } catch (error) {
        console.log(error)
        return response
          .status(400)
          .send('Não foi possível Adicionar o status do Associado.')
      }
    }

    async show ({ params, response }) {
      try {
        console.log('associado status  - show')
        const status = PessoaStatus.query()
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
          .send('Não foi possível exibir um status do Associado solicitado.')
      }
    }

}

module.exports = PessoaStatusController
