'use strict'

const AllcanceSMS = use('App/Services/SMS/AllcanceSMS')

function Factory() {
	async function Servico(servico) {
		try {
			if (servico === 'allcancesms') {
				return AllcanceSMS()
			}

			throw {
				success: false,
				message: 'SMS - não foi localizado uma conta compativel.',
			}
		} catch (e) {
			console.log('factory error ', e)
		}
	}

	return { Servico }
}

module.exports = Factory
