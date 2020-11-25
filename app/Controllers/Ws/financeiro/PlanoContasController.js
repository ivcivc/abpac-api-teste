'use strict'

const PlanoDeContaServices = use("App/Services/PlanoDeConta");

class PlanoContaController {

  constructor ({ socket, request }) {
    this.socket = socket
    this.request = request
    this.topic = socket.topic;
  }

  async onAll() {
   try {

      const reg = await new PlanoDeContaServices().getCombo()

      this.socket.emit("PLANO-DE-CONTAS-REFRESH", reg)


    } catch (e) {
      throw e;
    }
  }

  async getAll() {

  }

}

module.exports = PlanoContaController
