'use strict'
const Env = use('Env')
const Youch = use('youch')

const BaseExceptionHandler = use('BaseExceptionHandler')

/**
 * This class handles all exceptions thrown during
 * the HTTP request lifecycle.
 *
 * @class ExceptionHandler
 */
class ExceptionHandler extends BaseExceptionHandler {
   /**
    * Handle exception thrown during the HTTP lifecycle
    *
    * @method handle
    *
    * @param  {Object} error
    * @param  {Object} options.request
    * @param  {Object} options.response
    *
    * @return {void}
    */
   async handle(error, { request, response }) {
      console.log('handle acionado ......... ')
      if (error.name === 'ValidationException') {
         return response.status(error.status).send({
            type: false,
            name: 'Validation',
            message: 'Ocorreu uma falha de validação.',
            messages: error.messages,
         })
      }

      if (error.code === 'ER_BAD_FIELD_ERROR') {
         // statis= 500 - campo de tabela
         return response
            .status(error.status)
            .send({ type: false, message: 'Ocorreu um erro de persistência.' })
      }

      if (Env.get('NODE_ENV') === 'development') {
         const youch = new Youch(error, request.request)
         const errorJSON = await youch.toJSON()

         return response.status(error.status).send(errorJSON)
      }

      if (error.code === 'ER_DUP_ENTRY') {
         return response.status(error.status).send({
            type: false,
            message: 'Ocorreu um erro de duplicidade de registro.',
         })
      }

      if (error.code === 'E_MISSING_DATABASE_ROW') {
         // status 404 - findorFail
         return response
            .status(error.status)
            .send({ type: false, message: 'Registro não localizado.' })
      }

      if (error.code === 'WARN_DATA_TRUNCATED') {
         // status 404 - findorFail
         return response.status(error.status).send({
            type: false,
            message: 'Campos com informações não permitida.',
         })
      }

      if (error.code === 'PERSONALIZADO') {
         // status 404 - findorFail
         return response
            .status(error.status)
            .send({ type: false, message: error.message })
      }

      if (error.status === 500) {
         // statis= 500

         return response
            .status(error.status)
            .send({ type: false, message: error.message })
      }

      return response.status(error.status).send('Ocorreu um erro.')
   }

   /**
    * Report exception for logging or debugging.
    *
    * @method report
    *
    * @param  {Object} error
    * @param  {Object} options.request
    *
    * @return {void}
    */
   async report(error, { request }) {
      console.log('report... ', error)
      if (error.code === 'ER_BAD_FIELD_ERROR') {
         // statis= 500
         console.log({
            error: error.errno,
            sqlMessage: error.sqlMessage,
            status: error.status,
            code: error.code,
         })
         return
      }
      if (error.status === 500) {
         // statis= 500
         console.log({
            error: error.stack,
            message: error.message,
            status: error.status,
            code: error.code,
         })
         return
      }
      console.log({
         error: error.errno,
         status: error.status,
         code: error.code,
         message: error.message,
         sqlMessage: error.sqlMessage,
      })
   }
}

module.exports = ExceptionHandler
