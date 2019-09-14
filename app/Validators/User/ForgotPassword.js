'use strict'

class UserForgotPassword {
  get rules () {
    return {
      email: 'required|email',
      redirect_url: 'required|url'
    }
  }

  get validateAll() {
   return true
  }

  get messages () {
   return {
     'email.required': 'O email é obrigatório.',
     'email.email': 'Formato de email não reconhecido.',
     'redirect_url.required': 'É obrigatório informar a url do frontend.',
     'redirect_url.url': 'formato de url não reconhecido.'
   }
 }


}

module.exports = UserForgotPassword
