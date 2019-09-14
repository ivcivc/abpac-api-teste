'use strict'

class UserUpdate {
  get rules () {
   return {
      email: 'required|email',
      password: 'string'
    }
  }


  get validateAll() {
   return true
  }

  get messages () {
   return {
     'email.required': 'O email é obrigatório.',
     'email.email': 'Formato de email não reconhecido.',
     'email.unique': 'Email informado já existe.',

     'password.required': 'A senha é obrigatória.'
   }
 }

}

module.exports = UserUpdate
