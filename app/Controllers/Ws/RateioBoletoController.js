'use strict'

const ModelLancamento = use('App/Models/Lancamento')
const RateioServices = use('App/Services/Rateio')
const LancamentoService = use('App/Services/Lancamento')
const Ws = use('Ws')

class RateioBoletoController {
   constructor({ socket, request }) {
      this.socket = socket;
      this.topic = socket.topic;
      this.request = request;
      this.arr= []

      console.log(`Back ${this.topic} connected to WS ${this.topic}`);

    }

      async onMessage(e) {
         console.log('message disparada')
         this.socket.emit('MENSAGEM', e)
      }

     async onClose() {
        console.log(`Topic ${this.topic} disconnected to WS ${this.topic}`);
     }

     async onCreate(e) {
           this.arr.push(e)
           this.socket.emit('RATEIO-BOLETO-CREATE', { success: true, message: "Adicionado com sucesso!"})
           this.socket.emit('MENSAGEM', { tipo: 'CREATE', data: e, message: "Adicionado com sucesso!"})
           //this.socket.broadcastToAll("RATEIO-BOLETO-REFRESH", this.arr)
     }

     async onLocalizar(rateio_id) {
        console.log('onLocalizar rateio (financeiro)')       
        
        try {
            const model = await ModelLancamento.query().select('id', 'dVencimento', 'conta_id', 'pessoa_id', 'rateio_id', 'valorTotal', 'situacao', 'status', 'creditoRateio', 'isBaixa', 'isZap', 'isEmail', 'isRelatorio', 'updated_at')
               .where('rateio_id', rateio_id).where('creditoRateio', 'Não')         
               .with('pessoa', build => {
                  build.select('id','nome','cpfCnpj', 'parcela')
               })
               .with('boletos', build => {
                  build.whereIn('status',['Aberto', 'Compensado'])
               })
               .with('conta')
               .fetch()

            this.socket.broadcastToAll("RATEIO-BOLETO-REFRESH", { tipo: 'LOCALIZAR', success: true, data: model})

      
         } catch (error) {
            console.log('CATH >>>>>>>>>>>>>>>>>>>>>>>> 2')
            console.log(error)
            this.socket.broadcastToAll("RATEIO-BOLETO-REFRESH", { tipo: 'ERROR', data: null, message: "Não foi possível carregar o financeiro"})
         }

       
     }

    async onError(e) {

    }

     emitBroadcast(TOPICO, DATA) {
        const topic = Ws.getChannel('rateio-boleto:*').topic(
           'rateio-boleto:1'
        )

        if (topic) {
           topic.broadcast(TOPICO, DATA)
        }
     }

    async onGerarPDF(rateio_id) {
      try {

         const query = await ModelLancamento.query()
            .select('id', 'dVencimento', 'conta_id', 'pessoa_id', 'rateio_id', 'valorTotal', 'situacao', 'status', 'creditoRateio', 'isBaixa', 'isZap', 'isEmail', 'isRelatorio', 'updated_at')
            .where('rateio_id', rateio_id).where('creditoRateio', 'Não')         
            .with('pessoa', build => {
               build.select('id','nome','cpfCnpj', 'parcela')
            })
            .with('boletos', build => {
               build.whereIn('status',['Aberto', 'Compensado'])
            })
            .with('conta')
            .fetch()


         const iterator = this.addRelatorios( rateio_id, query.rows )

         let it = true

         while (it) {

            let r = await iterator.next()
            if (r.done) {
               it = false
               this.emitBroadcast("NOTIFICACAO", { tipo: 'CONCLUIDO', data: null, message: "Processamento finalizado"})
            }
   
         }


      } catch (error) {
         console.log(error)
         //this.socket.broadcastToAll("NOTIFICACAO", { tipo: 'ERROR', data: null, message: "Não foi possível carregar o financeiro"})
         this.emitBroadcast("NOTIFICACAO", { tipo: 'ERROR', data: null, message: "Ocorreu uma falha na geração do boleto/relatorio pdf"})
      }


    }

    async *addRelatorios(rateio_id, lista) {

      console.log('<<<<<<<<<<<<<<<  ADD RELATORIOS RATEIO >>>>>>>>>>>>>>>>>>>>>')

      const total_registro= lista.length

      for (const key in lista) {
         if (Object.hasOwnProperty.call(lista, key)) {
            const item= lista[key]
            try {
               const resBoleto= await this.addBoleto(item)

               let boletos= []

               if ( resBoleto.success) {
                  if ( resBoleto) {
                     if ( resBoleto.success) {
                        boletos= [{status: "Ativo"}]
                     }
                     
                  } 
               } else {
          
                  this.emitBroadcast("NOTIFICACAO", { tipo: 'ERROR', data: null, message: resBoleto.message + " (" + item.id + ')'})

               }               

               
               const topic = Ws.getChannel('rateio-boleto:*').topic(
                  'rateio-boleto:1'
               )

               if (topic) {

                  try {
                     this.emitBroadcast("UPDATE-REFRESH", { tipo: 'UPDATE', success: true, data: {id: item.id, boletos }})
                                 
                  } catch(e) {}
            
               }

               const res= await this.addRelatorio(item)

               await ModelLancamento.query()
                  .where('id', item.id)
                  .update({ isRelatorio: true })


               if (topic) {
                  try {                     
                     this.emitBroadcast("UPDATE-REFRESH", { tipo: 'UPDATE', success: true, data: {id: item.id, isRelatorio: res}})
                     this.emitBroadcast('TERMOMETRO', key / total_registro)   
                  } catch(e) {}                  
                              
               }

               yield true

            } catch(e) {
               
               const topic = Ws.getChannel('rateio-boleto:*').topic(
                  'rateio-boleto:1'
               )

               if (topic) {
                  try {
                     console.log('notificacao=> ', item.id)
                     //topic.broadcast("NOTIFICACAO", { tipo: 'ERROR', data: null, message: "Não foi possível carregar o financeiro"})
                     this.emitBroadcast("NOTIFICACAO", { tipo: 'ERROR', data: null, message: "Não foi possível carregar o financeiro (" + item.id + ')'})
                  } catch(e) {}
                  
               }

              
               yield false
            }
         }
         yield
      }

    }

    async addBoleto( registro ) {
      return new Promise(async (resolve, reject) => {
         
         try {


            //if ( registro.pessoa_id === 1843) {

               const service = await new LancamentoService().openBank_novoBoleto(
                  registro,
                  null
               )             


               return resolve(service)   
            //}

   
            //resolve({success: false, message: "boleto - MOCK "})
         } catch (error) {

            if ( error.nrErro === -200 ) {
               /// boleto já existe
               return resolve({ success: true, message: 'Boleto emitido.', data: error.data})
            }
   
            resolve(error)
         }

      })
       
    }

    async addRelatorio( registro) {
      return new Promise(async (resolve, reject) => {

         try {
    
            let res= await new RateioServices().PDF_TodosEquipamentosRateioPorPessoa(registro.pessoa_id, registro.rateio_id, false)
            // res.pasta, res.arquivo
            resolve(true)
         } catch(e) {
            resolve(false)
         }

      })
    }

}

module.exports = RateioBoletoController
