'use strict'

const PessoaServices = use("App/Services/Pessoa");


class PessoaPastaController {

   async getPastaID({ params, response }) {

      try {
        const pessoa = await new PessoaServices().getPasta(params.id);

        response.status(200).send({ type: true, data: pessoa });
      } catch (error) {
        console.log(error);
        response.status(400).send({code: error.code, message: error.message, name: error.name});
      }
    }
}

module.exports = PessoaPastaController
