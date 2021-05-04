'use strict'

const User = use('App/Models/User')

class UserController {
   async store({ request }) {
      const { permissions, roles, ...data } = request.only([
         'username',
         'email',
         'password',
         'permissions',
         'roles',
      ])

      const user = await User.create(data)

      if (roles) {
         await user.roles().attach(roles)
      }

      if (permissions) {
         await user.permissions().attach(permissions)
      }

      await user.loadMany(['roles', 'permissions'])

      return user
   }

   async update({ request, params }) {
      const { permissions, roles, ...data } = request.only([
         'username',
         'email',
         'password',
         'permissions',
         'roles',
      ])

      const user = await User.findOrFail(params.id)

      user.merge(data)

      await user.save()

      if (roles) {
         await user.roles().sync(roles)
      }

      if (permissions) {
         await user.permissions().sync(permissions)
      }

      await user.loadMany(['roles', 'permissions'])

      return user
   }

   async index() {
      const user = await User.query()
         .with('roles')
         .with('permissions')
         .setHidden(['password'])
         .fetch()

      return user
   }

   async show({ params, response }) {
      try {
         const user = await User.findOrFail(params.id)

         await user.load('roles')
         await user.load('permissions')

         return user
      } catch (_) {
         return response
            .status(401)
            .send('Não foi possível exibir o usuário solicitado.')
      }
   }

   async destroy({ params, response }) {
      try {
         const role = await User.findOrFail(params.id)

         await role.delete()

         return response.status(200).send('Usuário excluído com sucesso!')
      } catch (e) {
         return response
            .status(401)
            .send('Não foi possível excluir o usuário solicitado.')
      }
   }
}

module.exports = UserController
