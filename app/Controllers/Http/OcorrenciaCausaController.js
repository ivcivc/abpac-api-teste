'use strict'

const OcorrenciaCausa = use("App/Services/OcorrenciaCausa");

/**
 * Resourceful controller for interacting with ocorrenciacausas
 */
class OcorrenciaCausaController {
   async index ({response}) {
      try {
         const causa = await new OcorrenciaCausa().index();

         response.status(200).send({ type: true, data: causa });
      } catch (error) {

         response.status(400).send({code: error.code, message: error.message, name: error.name});
      }
  }

  /**
   * Create/save a new causa.
   * POST categorias
   */
  async store ({ request, response }) {

      const payload = request.all();

      try {
      const causa = await new OcorrenciaCausa().add(payload);

      response.status(200).send({ type: true, data: causa });
      } catch (error) {
         response.status(400).send(error);
      }
  }

  /**
   * Display a single causa.
   * GET categorias/:id
   */
  async show ({ params, response }) {
      try {
         const causa = await new OcorrenciaCausa().get(params.id);

         response.status(200).send({ type: true, data: causa });
      } catch (error) {
         console.log(error);
         response.status(400).send({code: error.code, message: error.message, name: error.name});
      }
  }



  /**
   * Update causa details.
   * PUT or PATCH categorias/:id
   */
  async update ({ params, request, response }) {
      const payload = request.all();
      const ID = params.id

      try {
      const causa = await new OcorrenciaCausa().update(ID, payload);

      response.status(200).send({ type: true, data: causa });
      } catch (error) {
         response.status(400).send(error);
      }
  }

  /**
   * Delete a categoria with id.
   * DELETE categorias/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy ({ params, request, response }) {
     const ID = params.id
     try {
        const causa = await new OcorrenciaCausa().del(ID)
        response.status(200).send(true);
     } catch (error) {
        response.status(400).send(error);
     }
  }

}

module.exports = OcorrenciaCausaController
