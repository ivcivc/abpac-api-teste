"use strict";

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

const Ws = use("Ws");

/*Ws.channel('chat', ({ socket }) => {
  console.log('user joined with %s socket id', socket.id)
})*/

// Financeiro
Ws.channel("ordem-servico:*", "OrdemServicoController");


Ws.channel("associado:*", "AssociadoController");

Ws.channel("chat:*", "ChatController");

Ws.channel("user:*", "UserController").middleware([]);
Ws.channel("user", "UserController");

Ws.channel("livre", "ChatController");

/*({ socket }) => {
  console.log("canal livre acionado.");
  socket.emit("livre", "canal livre >>>>>>>>>");
});*/
