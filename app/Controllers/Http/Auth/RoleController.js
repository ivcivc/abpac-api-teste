'use strict'

const Role = use('Adonis/Acl/Role')

class RoleController {

  async store({ request }) {

    const { permissions, ...data } = request.only([
      'name',
      'slug',
      'description',
      'permissions'
    ])

    const role = await Role.create(data)

    if (permissions) {
      await role.permissions().attach(permissions)
    }

    await role.load('permissions')

    return role
  }

  async index() {

    const roles = await Role.query()
      .with('permissions')
      .fetch()

    return roles
  }

  async update({ request, params }) {
    // const roles = request.input('roles')
    const { permissions, ...data } = request.only([
      'name',
      'slug',
      'description',
      'permissions'
    ])
    const role = await Role.findOrFail(params.id)
    // await user.roles().sync(roles)
    role.merge(data)

    await role.save()

    if (permissions) {
      await role.permissions().sync(permissions)
    }

    await role.load('permissions')

    return role
  }

  async destroy({ params }) {

    const role = await Role.findOrFail(params.id)
    await role.delete()
  }

  async show({ params }) {

    const role = await Role.findOrFail(params.id)

    await role.load('permissions')

    return role
  }
}

module.exports = RoleController
