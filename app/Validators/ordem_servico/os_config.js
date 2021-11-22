'use strict'

const mensagens = require('../messages')

class OcorrenciaOsConfig {
	get validateAll() {
		return true
	}

	get sanitizationRules() {
		return {
			descricao: 'trim',
		}
	}

	get rules() {
		const sanitizationRules = {
			descricao: 'trim',
		}

		const ID = this.ctx.params.id

		return {
			descricao: `required|string|min:3|max:45|unique:os_configs,descricao,id,${ID}`,
			status: 'required|string|in:Ativo,Inativo',
			modelo: 'required|string',
			gerarConta: 'required|string|in:Despesa,Receita,Não',
			rateio: 'required|string|in:Sim - Crédito,Sim,Não,Não - Crédito',
		}
	}

	get messages() {
		const regras = {
			'descricao.unique': 'Duplicidade de registro detectado!',
			'descricao.min': 'A descrição deve ter pelo menos 3 caracteres.',
			'status.in': 'Status com informações não permitidas.',
			'gerarConta.in': 'Valor não permitida para o campo GERAR CONTA',
			'rateio.in': 'Valor não permitido para o campo RATEIO',
		}

		return Object.assign({}, mensagens, regras)
	}
}

module.exports = OcorrenciaOsConfig
