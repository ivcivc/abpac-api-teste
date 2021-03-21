'use strict'

class PingController {
   constructor({ socket, request }) {
      this.socket = socket
      this.request = request
      this.topic = socket.topic
   }

   async onClose() {
      console.log(`Topic ${this.topic} disconnected to WS ${this.topic}`)
   }

   async onPing(data) {
      //throw 'falhou'
      this.socket.emit('ping', 'pong')
   }

   async onError() {
      console.log(`Topic ${this.topic} onError to WS ${this.topic}`)
      this.socket.emit('error', 'o pingo falhou meu caro')
   }
}

module.exports = PingController
