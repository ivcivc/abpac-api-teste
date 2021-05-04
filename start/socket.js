'use strict'

/*
|--------------------------------------------------------------------------
| Websocket
|--------------------------------------------------------------------------
|
| This file is used to register websocket channels and start the Ws server.
| Learn more about same in the official documentation.
| https://adonisjs.com/docs/websocket
|
| For middleware, do check `wsKernel.js` file.
|
*/

const Ws = use('Ws')

/*Ws.channel('chat', ({ socket }) => {
  console.log('user joined with %s socket id', socket.id)
})*/

// Financeiro
Ws.channel('ordem-servico:*', 'OrdemServicoController') //.topic("ordem-servico");
Ws.channel('ordem-servico-config:*', 'ordem_servico/OsConfigController')

Ws.channel('plano-de-contas:*', 'financeiro/planoContasController')

Ws.channel('pessoa:*', 'PessoaController')

Ws.channel('user:*', 'UserController').middleware([])
Ws.channel('user', 'UserController')

Ws.channel('ping', 'PingController')

Ws.channel('email_massa:*', 'EmailMassaController')
Ws.channel('zap_massa:*', 'myZap/ZapMassaController')


