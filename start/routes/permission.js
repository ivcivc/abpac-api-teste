'use strict'

const Route = use('Route')

Route.group(() => {

   Route.post('/passwords', 'Auth/ForgotController.store').validator('User/ForgotPassword')

   Route.put('/passwords', 'Auth/ForgotController.update').validator('User/ResetPassword')

   Route.resource('/users', 'Auth/UserController').validator( new Map([
      [['/users.store'], ['User/Create']],
      [['/users.update'], ['User/Update']]
   ]))

   Route.post('/sessions', 'Auth/SessionController.store') //.validator('User/Session')
   Route.post('/refresh', 'Auth/SessionController.refresh') //.middleware('auth')
   Route.post('/logout', 'Auth/SessionController.logout').middleware('auth')
   Route.post('/login', 'Auth/SessionController.login')

   Route.resource('/permissions', 'Auth/PermissionController')

   Route.resource('/roles', 'Auth/RoleController') //.apiOnly() // .middleware('auth')

}).prefix('api')
