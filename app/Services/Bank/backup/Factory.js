'use strict'

//const ModelConta = use('App/Models/Conta')
//const ModelBankConfig = use('App/Models/Bank/BankConfig')

const Sicoob = use('App/Services/Bank/Sicoob/Boleto')

function Factory() {
   async function Boleto(banco) {
      try {
         if (banco === 'sicoob') {
            return Sicoob()
         }

         throw {
            success: false,
            message: 'OpenBank - não foi localizado uma conta compativel.',
         }
      } catch (e) {
         console.log('factory error ', e)
      }
   }

   function ContaCorrente() {}

   return { Boleto, ContaCorrente }
}

module.exports = Factory
