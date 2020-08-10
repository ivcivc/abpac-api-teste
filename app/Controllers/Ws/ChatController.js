"use strict";

class ChatController {
  constructor({ socket, request }) {
    this.socket = socket;
    this.request = request;
    this.topic = socket.topic;

    console.log(`Chat - Back ${this.topic} connected to WS ${this.topic}`);

    this.socket.emit("message", {
      message: "hi! sou o contrutor do chatController.",
      time: new Date().valueOf()
    });
  }

  async onClose() {}

  async onMessage(data) {
    console.log("onMessage ativada.");
    //this.broadcastToAll("message", data);
    this.socket.emit("message", data);
  }

  async onLivre(data) {
    console.log("onLivre ativada.");
    //this.broadcastToAll("message", data);
    this.socket.emit("livre", data + ' server.');
  }
}

module.exports = ChatController;
