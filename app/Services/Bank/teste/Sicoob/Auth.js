function Auth() {
   async function callback(res) {
      return 'callback '
   }

   async function refreshToken(model) {
      return 'refreshToken'
   }

   async function validarToken(model) {
      return 'validarToken'
   }

   async function getRecurso(conta_id, recurso) {
      return 'getRecurso'
   }

   async function getToken(config = null) {
      return 'getToken'
   }

   return { getToken, callback }
}

module.exports = Auth
