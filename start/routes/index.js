'use strict'

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */

const Route = use('Route')

Route.group(() => {

   Route.get('/', () => {
      return { message: 'Abpac Server' }
   })

   Route.resource('/pessoas', 'PessoaController').middleware([
      'auth'
   ]).validator( new Map([
      [['/pessoas.store'], ['Pessoa/Create']],


   Route.resource('/pessoaStatus', 'PessoaStatusController').middleware([
    'auth'
   ]),

   Route.resource('/categoria', 'CategoriaController').middleware([
      'auth'
     ])

]))

}).prefix('api')

// middleware(['auth', 'is:(admin || manager')])
Route.post('/lucidql', 'LucidQlController.query').prefix('api')

require('./permission')

/*

.middleware(['auth', 'is:(administrador || moderador)'])
.except(['index','show'])

.middleware(['auth', 'can:(adicionar-cliente )'])

*/
