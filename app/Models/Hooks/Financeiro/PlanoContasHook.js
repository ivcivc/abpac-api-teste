'use strict'

const PlanoDeContaServices = use("App/Services/PlanoDeConta");
const Ws = use('Ws')


const PlanoContaHook = exports = module.exports = {}


PlanoContaHook.all = async (data) => {

   const planoConta = await new PlanoDeContaServices().getCombo()

   const topic= Ws.getChannel('plano-de-contas:*').topic('plano-de-contas:plano-de-contas')

   if (topic) {
      topic.broadcast("PLANO-DE-CONTAS-REFRESH", planoConta)
   }

}
