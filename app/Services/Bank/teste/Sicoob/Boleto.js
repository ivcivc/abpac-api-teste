
const ModelConta = use('App/Models/Conta')

function Boleto() {
   async function getToken(config) {
      return new Promise((resolve, reject) => {
         console.log('getToken')

         throw { success: false, message: 'Falhou no getToken' }

         resolve(true)
      })
   }
   async function localizarConta(conta_id) {
      throw { success: false, message: 'Falha no metodo localizarConta' }
      console.log('localizarConta')
   }

   function validarArquiConfiguracao(config) {
      console.log('validarArquiConfiguracao')
   }

   async function localizarBoleto(config = null) {
      return new Promise(async (resolve, reject) => {
         try {
            await getToken()
            let m = await ModelConta.find(1)
            return resolve(m)
         } catch (e) {
            console.log('catch localizarBoleto ', e)
         }
         console.log('localizarBoleto')
         try {
            abc()
            resolve('resolvido')
         } catch (e) {
            console.log('eita')
            reject('rejeitado')
         }

         //throw { success: false, message: 'Falha no metodo localizarBoleto' }
      })
   }

   async function novoBoleto(lancamento, config = null) {
      console.log('novoBoleto')
   }

   return { localizarBoleto, novoBoleto }
}

module.exports = Boleto
