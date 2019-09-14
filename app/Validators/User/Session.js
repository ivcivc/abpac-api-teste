'use strict'

class UserSession {
  get rules () {
    return {
      email: 'required|email',
      password: 'required'
    }
  }

  get validateAll() {
   return true
  }

  get messages () {
   return {
     'email.required': 'O email é obrigatório.',
     'email.email': 'Formato de email não reconhecido.',
     'password.required': 'A senha é obrigatória.'
   }
 }


}

module.exports = UserSession
