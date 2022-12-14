'use strict'

const PessoaServices = use("App/Services/Fornecedor");

class FornecedorController {
   async store({ request, response, auth }) {
      const payload = request.all();

      try {
        payload.tipo= "Fornecedor"
        payload.status= 'Ativo'

        const pessoa = await new PessoaServices().add(payload, null, auth);

        response.status(200).send({ type: true, data: pessoa });
      } catch (error) {
        console.log(error);
        response.status(400).send(error);
      }
    }

    async update({ request, params, response, auth  }) {
     const payload = request.all();
     const ID = params.id

     try {
       const pessoa = await new PessoaServices().update(ID, payload, null, auth);

       response.status(200).send({ type: true, data: pessoa });
     } catch (error) {
       console.log(error);
       response.status(400).send(error);
     }
    }

    async show({ params, response }) {

     try {
       const pessoa = await new PessoaServices().get(params.id);

       response.status(200).send({ type: true, data: pessoa });
     } catch (error) {
       console.log(error);
       response.status(400).send({code: error.code, message: error.message, name: error.name});
     }
   }

   async index({ response }) {

     try {
       const pessoa = await new PessoaServices().index();

       response.status(200).send({ type: true, data: pessoa });
     } catch (error) {
       console.log(error);
       response.status(400).send({code: error.code, message: error.message, name: error.name});
     }
   }
}

module.exports = FornecedorController
