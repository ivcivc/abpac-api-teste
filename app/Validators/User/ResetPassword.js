'use strict'

class UserResetPassword {
  get rules () {
   return {
      token: 'required',
      password: 'required|confirmed'
    }
  }

  get validateAll() {
   return true
  }

  get messages () {
   return {
     'token.required': 'O token é obrigatório.',
     'password.required': 'A senha é obrigatória.',
     'password.confirmed': 'A senha não foi confirmada.'
   }
 }

}

module.exports = UserResetPassword
