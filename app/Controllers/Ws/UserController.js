"use strict";
const User = use('App/Models/User')

class UserController {
  constructor({ socket, request, auth }) {
    this.socket = socket;
    this.topic = socket.topic;
    this.request = request;
    this.auth = auth

    console.log(`Back ${this.topic} connected to WS ${this.topic}`);

    this.socket.emit("LOGIN_EVENT", {
      message: "Conectado ao LOGIN",
      time: new Date().valueOf()
    });
    this.socket.broadcast('LOGIN_EVENT', { message: "login event via broadcast"})
  }

  async onClose() {
    console.log(`Topic ${this.topic} disconnected to WS ${this.topic}`);
  }

  async onRefreshToken(refreshToken) {
    console.log(`onRefreshToken topico: ${this.topic}`, refreshToken);

    try {

      const newToken = await this.auth.newRefreshToken().generateForRefreshToken(refreshToken, true) //await auth.generateForRefreshToken(token, true)

      this.socket.emit("REFRESH-TOKEN", { type: true, token: newToken})

   } catch(e) {
      this.socket.emit("REFRESH-TOKEN", {
         type: false,
         message: "Ocorreu falha na transação"
       });
   }

  }

  async onLogin(data) {

   const { email, password } = data

   try {
      const token = await this.auth.attempt( email, password)
      console.log('token ', token.token)

      const user = await User.findByOrFail('email', email)

      const newTokenRefresh =  await this.auth.withRefreshToken().attempt( email, password)

      console.log('new ', newTokenRefresh)

      const namePart= user.username.split( ' ')

      const firstname= namePart[0]
      const lastname = namePart.length === 1 ? ''  :  namePart[namePart.length - 1]
      const avatar = `/static/doc-images/lists/men1.png`
      const status= {
         color: "success",
         icon: "check_circle"
      }

      await user.loadMany(['roles', 'permissions'])

      user.id= user.id
      user.name= user.username
      user.firstname= firstname
      user.lastname= lastname
      user.avatar= avatar
      user.status= status

      const permissions= await user.permissions().fetch()
      const roles = await user.roles().fetch()

      const oUser= {
         id: user.id, name: user.username, lastname, firstname, avatar, status, token: newTokenRefresh
      }
      console.log("onLogin", { type: true, data: oUser});
      this.socket.emit("LOGIN", { type: true, data: oUser});

   } catch( e) {
      console.log('login falha', e)
      this.socket.emit("LOGIN", { type: false, message: "Não foi possível fazer login"})
   }

 }


  async onError() {
     console.log('METODO ERROR do WS User Controller')
  }
}

module.exports = UserController;
