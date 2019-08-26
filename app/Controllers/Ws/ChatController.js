"use strict";

class ChatController {
  constructor({ socket, request }) {
    this.socket = socket;
    this.request = request;
  }

  onClose() {}

  onMessage(data) {
    this.broadcastToAll("message", data);
  }
}

module.exports = ChatController;
