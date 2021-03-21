'use strict'

const Ws = use('Ws')

const PessoaHook = (exports = module.exports = {})

PessoaHook.method = async modelInstance => {}

PessoaHook.addWs = async pessoa => {
   const topic = Ws.getChannel('pessoa').topic('pessoa')
   if (topic) {
      topic.broadcast('message', { operation: 'add', data: pessoa.toJSON() })
   }
}

PessoaHook.updateWs = async pessoa => {
   const topic = Ws.getChannel('pessoa:*').topic('pessoa:pessoa')
   if (topic) {
      topic.broadcast('message', { operation: 'update', data: pessoa.toJSON() })
   }
}
