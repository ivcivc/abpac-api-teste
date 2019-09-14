"use strict";

//const PessoaServices = use("App/Services/Pessoa");

class AssociadoController {
  constructor({ socket, request }) {
    this.socket = socket;
    this.topic = socket.topic;
    this.request = request;

    console.log(`Back ${this.topic} connected to WS ${this.topic}`);

  }

  async onClose() {
    console.log(`Topic ${this.topic} disconnected to WS ${this.topic}`);
  }

  async onLocalizar(data) {
    console.log("onLocalizar", data);
    this.socket.emit("ASSOCIADO_LOCALIZAR", {message: 'do servidor', data});
  }

  async onError() {}
}

module.exports = AssociadoController;
