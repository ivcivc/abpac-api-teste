'use strict'

const Env = use('Env')

module.exports = {

  /**
   * The access key credentials created when configuring Spaces
   */
  credentials: {
    key: Env.get('SPACES_KEY') || null,
    secret: Env.get('SPACES_SECRET') || null
  },

  /**
   * Name of the bucket you have created for this project
   */
  bucket: Env.get('SPACES_BUCKET') || null,

  /**
   * Selected Spaces region
   */
  region: Env.get('SPACES_REGION') || null

}
