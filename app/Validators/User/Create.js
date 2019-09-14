'use strict'

class UserCreate {
  get validateAll() {
     return true
  }

  get rules () {
    return {
      username: 'required|unique:users,username',
      email: 'required|email|unique:users,email',
      password: 'required|confirmed'
    }
  }

  get messages () {
   return {
     'username.required': 'O nome do usuário é obrigatório',
     'username.unique': 'O nome do usuário deve ser único.',
     'email.required': 'O email é obrigatório.',
     'email.email': 'Formato de email não reconhecido.',
     'email.unique': 'Email informado já existe.',
     'password.required': 'A senha é obrigatória.',
     'password.confirmed': 'A senha não foi confirmada.'
   }
 }

}

module.exports = UserCreate
