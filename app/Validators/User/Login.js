'use strict'

class UserLogin {
  get rules () {
    return {
      email: 'required|email|unique:users,email',
      password: 'required'
    }
  }

  get validateAll() {
   return true
}

}

module.exports = UserLogin
