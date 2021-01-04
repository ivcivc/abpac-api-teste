'use strict'

const Mail = use('Mail')

const Env = use('Env')
//const queue = require('queue')
const Helpers = use('Helpers')

class EmailController {
   async enviar({ request, response, view }) {
      const data = request.only(['email', 'nome'])
      //const user = await User.create(data)

      let emailBoasVindas = 'Olá sr {{nome}}'

      await Mail.send(
         'emails.rateio_boleto',
         { nome: 'Ivan', dVencimento: '20/12/2020' },
         message => {
            message
               .to(data.email)
               .from('investimentos@abpac.com.br')
               .subject('Teste de Email ABPAC')
               .attach(Helpers.tmpPath('ACBr/pdf/boleto_50173.pdf'))
               .embed(Helpers.publicPath('images/logo-abpac.png'), 'logo')
         }
      )

      //return 'Registered successfully'

      response
         .status(200)
         .send({ success: true, message: 'Registered successfully' })
   }
}

module.exports = EmailController
