'use strict'

const ModelConta = use('App/Models/Conta')
//const ModelBankConfig = use('App/Models/Bank/BankConfig')

const Sicoob = use('App/Services/Bank/Sicoob/Boleto')

function Factory() {
   async function Boleto(banco) {
      if (banco === 'sicoob') {
         return Sicoob()
      }

      throw {
         success: false,
         message: 'OpenBank - não foi localizado uma conta compativel.',
      }
   }

   function ContaCorrente() {}

   return { Boleto, ContaCorrente }
}

module.exports = Factory
