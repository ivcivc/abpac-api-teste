'use strict'

//const PessoaServices = use("App/Services/Pessoa");

class PessoaController {
   constructor({ socket, request }) {
      this.socket = socket
      this.topic = socket.topic
      this.request = request
      this.arr = []

      const [, id] = this.socket.topic.split(':')

      this.pessoa_id = id

      console.log('array ', id)

      console.log(`Back ${this.topic} connected to WS ${this.topic}`)
   }

   async onClose() {
      console.log(`Topic ${this.topic} disconnected to WS ${this.topic}`)
   }

   async onMessage(e) {
      console.log('message disparada')
      this.socket.emit('message', 'mensagem enviada')
   }

   async onCreate(e) {
      this.arr.push(e)
      this.socket.broadcastAll('ASSOCIADO_LOCALIZAR', this.arr)
   }

   async onUpdate(e) {
      this.socket.emit('ASSOCIADO_LOCALIZAR', e)
   }

   async onDelete(e) {
      this.arr.push(e)
      this.socket.emit('ASSOCIADO-DELETE', {
         success: true,
         message: 'Excluído com sucesso!',
         data: e,
      })
   }

   async onLocalizar(data) {
      const topic = this.socket.topic
      console.log('onLocalizar', data)
      this.arr = [
         { id: 1, nome: 'ivan carlos' },
         { id: 2, nome: 'Carlos' },
      ]
      let x = this.arr[data.id]
      //this.socket.emit("ASSOCIADO_LOCALIZAR", {message: 'do servidor', data});
      this.socket.broadcastToAll('message', x)
   }

   async onLocalizar2(data) {
      console.log('onLocalizar', data)
      this.arr = [
         { id: 1, nome: 'ivan carlos' },
         { id: 2, nome: 'Carlos' },
      ]
      //this.socket.emit("ASSOCIADO_LOCALIZAR", {message: 'do servidor', data});
      this.socket.broadcastToAll('ASSOCIADO_LOCALIZAR', this.arr)
   }
   async onError() {}
}

module.exports = PessoaController
