'use strict'

class OrdemServicoController {
   constructor({ socket, request }) {
      this.socket = socket;
      this.topic = socket.topic;
      this.request = request;
      this.arr= []

      console.log(`Back ${this.topic} connected to WS ${this.topic}`);

    }

     async onClose() {
        console.log(`Topic ${this.topic} disconnected to WS ${this.topic}`);
     }

     async onCreate(e) {
           this.arr.push(e)
           this.socket.emit('ORDEM-SERVICO-CREATE', { success: true, message: "Adicionado com sucesso!"})
           this.socket.broadcastToAll("ORDEM-SERVICO-REFRESH", this.arr)
     }

     async onUpdate(e) {
        this.socket.emit('ORDEM-SERVICO-UPDATE', { success: true, message: "Atualizado com sucesso!"})
        this.socket.broadcastToAll("ORDEM-SERVICO-REFRESH", e)
     }

     async onDelete(e) {
        this.socket.emit("ASSOCIADO-DELETE", {success: true, message: "Excluído com sucesso!", data: e})
     }

     async onFilter(data) {
      console.log('onFilter')
      this.arr=  [{id: 1, nome: "ivan carlos a."},{id:2 , nome: "Carlos da silva"}]
      //this.socket.emit('ORDEM-SERVICO-UPDATE', { success: true, message: "Localizado com sucesso!"})
      this.socket.broadcastToAll("ORDEM-SERVICO-REFRESH", this.arr)
    }

     async onLocalizar(data) {
        console.log('onLocalizar')
        this.arr=  [{id: 1, nome: "ivan carlos a."},{id:2 , nome: "Carlos"}]
        //this.socket.emit('ORDEM-SERVICO-UPDATE', { success: true, message: "Localizado com sucesso!"})
        this.socket.broadcastToAll("ORDEM-SERVICO-REFRESH", this.arr)
     }

     async onLocaliza2r(data) {
      console.log('onLocalizar')
      this.arr=  [{id: 1, nome: "ivan carlos a. oliveira"},{id:2 , nome: "Carlos"}]
      //this.socket.emit('ORDEM-SERVICO-UPDATE', { success: true, message: "Localizado com sucesso!"})
      this.socket.broadcastToAll("ORDEM-SERVICO-REFRESH-2", this.arr)
   }

    async onError(e) {

    }

}

module.exports = OrdemServicoController
