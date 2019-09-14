'use strict'

const User = use('App/Models/User')

class SessionController {

  async store({ request, response, auth }) {

      const { email, password } = request.all()

      const token = await auth.withRefreshToken().attempt( email, password)

      try {
         await auth.check()
       } catch (error) {
          console.log('falhouuuuuuuuuuuuuuuuuuu')
         response.send(error.message)
       }

      const user = await auth.getUser()

      const namePart= user.username.split( ' ')

      const id = user.id
      const name= user.username
      const firstname= namePart[0]
      const lastname = namePart.length === 1 ? ''  :  namePart[namePart.length - 1]
      const avatar = `/static/doc-images/lists/men1.png`
      const status= {
         color: "success",
         icon: "check_circle"
       }

      const userAdd= {id, name, firstname, lastname, avatar, status}


      return Object.assign({}, userAdd , token)
  }

  async refresh( { request, response, auth}) {

      try {
         //let password = request.input('password')
         let refreshToken = request.input('refreshToken')

         if ( !refreshToken) {
            refreshToken= request.header('refreshToken')
         }

         //return await auth.listTokens()

         const newToken = await auth.newRefreshToken().generateForRefreshToken(refreshToken, true) //await auth.generateForRefreshToken(token, true)

         return response.send(newToken)

      } catch(e) {
         return response.status(401).send({ message: e.message })
      }


  }

  async login({ request, response, auth }) {

      const { email, password } = request.all()

      const token = await auth.attempt( email, password)
      console.log('token ', token.token)

      const user = await User.findByOrFail('email', email)

      const newTokenRefresh =  await auth.withRefreshToken().attempt( email, password)

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

      user.name= user.username
      user.firstname= firstname
      user.lastname= lastname
      user.avatar= avatar
      user.status= status

      const permissions= await user.permissions().fetch()
      const roles = await user.roles().fetch()

      const oUser= {
         name: user.username, lastname, firstname, avatar, status, token: newTokenRefresh, permissions, roles
      }

      return oUser
  }


  async logout( { request, response, auth}) {

      let refreshToken = request.input('refreshToken')

      if ( ! refreshToken) {
         refreshToken= request.header('refreshToken')
      }

      //auth.logout()
      auth.authenticator('jwt').revokeTokens([refreshToken], true)
      return response.status(204).send({})
  }


}

module.exports = SessionController
