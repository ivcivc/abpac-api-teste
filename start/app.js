'use strict'
const path = require('path')
/*
|--------------------------------------------------------------------------
| Providers
|--------------------------------------------------------------------------
|
| Providers are building blocks for your Adonis app. Anytime you install
| a new Adonis specific package, chances are you will register the
| provider here.
|
*/
const providers = [
   '@adonisjs/framework/providers/AppProvider',
   '@adonisjs/auth/providers/AuthProvider',
   '@adonisjs/bodyparser/providers/BodyParserProvider',
   '@adonisjs/cors/providers/CorsProvider',
   '@adonisjs/lucid/providers/LucidProvider',
   '@adonisjs/websocket/providers/WsProvider',
   '@adonisjs/mail/providers/MailProvider',
   '@adonisjs/framework/providers/ViewProvider',
   'adonis-acl/providers/AclProvider',
   'adonis-acl/providers/AclProvider',
   '@adonisjs/validator/providers/ValidatorProvider',
   path.join(__dirname, '..', 'app/providers', 'ValidateCompoundUnique/Provider'),
   path.join(__dirname, '..', 'app/providers', 'ValidateCpfCnpj/Provider'),
   '@adonisjs/drive/providers/DriveProvider',
   '@adonisjs/redis/providers/RedisProvider',
   'adonis-kue/providers/KueProvider'
]

/*
|--------------------------------------------------------------------------
| Ace Providers
|--------------------------------------------------------------------------
|
| Ace providers are required only when running ace commands. For example
| Providers for migrations, tests etc.
|
*/
const aceProviders = [
   '@adonisjs/lucid/providers/MigrationsProvider',
   'adonis-acl/providers/CommandsProvider',
   'adonis-acl/providers/CommandsProvider',
   'adonis-kue/providers/CommandsProvider'
]

/*
|--------------------------------------------------------------------------
| Aliases
|--------------------------------------------------------------------------
|
| Aliases are short unique names for IoC container bindings. You are free
| to create your own aliases.
|
| For example:
|   { Route: 'Adonis/Src/Route' }
|
*/
const aliases = {
   Role: 'Adonis/Acl/Role',
   Permission: 'Adonis/Acl/Permission'
}

/*
|--------------------------------------------------------------------------
| Commands
|--------------------------------------------------------------------------
|
| Here you store ace commands for your package
|
*/
const commands = []

/* Meus jobs para Redis */
const jobs = ['App/Jobs/SincronizarDropbox']
//****** */

module.exports = { providers, aceProviders, aliases, commands, jobs }
