"use strict";

class UserController {
  constructor({ socket, request }) {
    this.socket = socket;
    this.topic = socket.topic;
    this.request = request;

    console.log(`Back ${this.topic} connected to WS ${this.topic}`);

    this.socket.emit("LOGIN_EVENT", {
      message: "Conectado ao LOGIN",
      time: new Date().valueOf()
    });
  }

  async onClose() {
    console.log(`Topic ${this.topic} disconnected to WS ${this.topic}`);
  }

  async onRefreshToken(data) {
    console.log("onRefreshToken", data);
    this.socket.emit("REFRESH-TOKEN", {
      type: data==='1'? true : false,
      token: '123', refresh_token: '456'
    });
  }



  async onError() {}
}

module.exports = UserController;
