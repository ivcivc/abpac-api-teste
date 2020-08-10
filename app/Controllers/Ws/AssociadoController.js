"use strict";

//const PessoaServices = use("App/Services/Pessoa");

class AssociadoController {
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
         this.socket.broadcastAll("ASSOCIADO_LOCALIZAR", this.arr)
   }

   async onUpdate(e) {
      this.socket.emit("ASSOCIADO_LOCALIZAR", e)
   }

   async onDelete(e) {
      this.arr.push(e)
      this.socket.emit("ASSOCIADO-DELETE", {success: true, message: "Excluído com sucesso!", data: e})
   }

   async onLocalizar(data) {
      console.log("onLocalizar", data);
      this.arr=  [{id: 1, nome: "ivan carlos"},{id:2 , nome: "Carlos"}]
      //this.socket.emit("ASSOCIADO_LOCALIZAR", {message: 'do servidor', data});
      this.socket.broadcastToAll("ASSOCIADO_LOCALIZAR", this.arr)
   }

  async onError() {}
}

module.exports = AssociadoController;
