'use strict'

const Env = use('Env')

//process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' // adicionado em 07/07/2022 certifificad autoassinado

module.exports = {
	/*
  |--------------------------------------------------------------------------
  | Connection
  |--------------------------------------------------------------------------
  |
  | Connection to be used for sending emails. Each connection needs to
  | define a driver too.
  |
  */
	connection: Env.get('MAIL_CONNECTION', 'smtp'),

	/*
  |--------------------------------------------------------------------------
  | SMTP
  |--------------------------------------------------------------------------
  |
  | Here we define configuration for sending emails via SMTP.
  |
  */
	smtp: {
		driver: 'smtp',
		pool: true,
		port: Env.get('MAIL_PORT'),
		host: Env.get('MAIL_HOST'),
		secure: true,
		auth: {
			user: Env.get('MAIL_LOGIN'),
			pass: Env.get('MAIL_PASSWORD'),
		},
		maxConnections: 5,
		maxMessages: 100,
		rateLimit: 10,
	},

	/*
  |--------------------------------------------------------------------------
  | SparkPost
  |--------------------------------------------------------------------------
  |
  | Here we define configuration for spark post. Extra options can be defined
  | inside the `extra` object.
  |
  | https://developer.sparkpost.com/api/transmissions.html#header-options-attributes
  |
  | extras: {
  |   campaign_id: 'sparkpost campaign id',
  |   options: { // sparkpost options }
  | }
  |
  */
	sparkpost: {
		driver: 'sparkpost',
		host: 'smtplw.com.br',
		port: 465,
		apiKey: Env.get('SPARKPOST_API_KEY'),
		extras: {},
	},

	/*
  |--------------------------------------------------------------------------
  | Mailgun
  |--------------------------------------------------------------------------
  |
  | Here we define configuration for mailgun. Extra options can be defined
  | inside the `extra` object.
  |
  | https://mailgun-documentation.readthedocs.io/en/latest/api-sending.html#sending
  |
  | extras: {
  |   'o:tag': '',
  |   'o:campaign': '',,
  |   . . .
  | }
  |
  */
	mailgun: {
		driver: 'mailgun',
		domain: Env.get('MAILGUN_DOMAIN'),
		apiKey: Env.get('MAILGUN_API_KEY'),
		extras: {},
	},

	/*
  |--------------------------------------------------------------------------
  | Ethereal
  |--------------------------------------------------------------------------
  |
  | Ethereal driver to quickly test emails in your browser. A disposable
  | account is created automatically for you.
  |
  | https://ethereal.email
  |
  */
	ethereal: {
		driver: 'ethereal',
	},
}
