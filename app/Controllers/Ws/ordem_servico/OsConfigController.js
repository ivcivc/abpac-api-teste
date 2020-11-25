'use strict'

const Service = use("App/Services/OSConfig")


class OsConfigController {
  constructor ({ socket, request }) {
    this.socket = socket
    this.topic = socket.topic;
    this.request = request
    console.log(`Back ${this.topic} connected to WS ${this.topic}`);
  }

  async onCreate(data) {
      /*try {
         console.log("rodando create")
         let registro = await new Service().add(data)

         this.socket.emit("OS-CONFIG-ADD",{success: true, message: "Registro adicionado com successo!", data: registro.toJson()})

      } catch (e) {
         //console.log('falhou ', e)
         throw e
         //this.socket.emit("OS-CONFIG-ADD",{success: false, message: "Não foi possível adicionar este registro.", error: e})
       }*/


  }

  onUpdate(data) {

  }

  onError(data) {
     console.log('metodo onError')
     this.socket.emit("OS-CONFIG-ADD",{success: true, message: "Registro adicionado com successo!", data:data})
  }
}

module.exports = OsConfigController
