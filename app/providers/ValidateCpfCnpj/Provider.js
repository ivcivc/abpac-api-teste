'use strict'

const { ServiceProvider } = require('@adonisjs/fold')

const validator = require("validator-brazil")

class ValidateCpfCnpj extends ServiceProvider {
  async _Fn (data, field, message, args, get) {
    //const util = require('util')
    const tipoPessoa= data['tipoPessoa']
    if ( !tipoPessoa) {
       throw "Tipo de pessoa não informado"
    }

    if ( tipoPessoa !== 'Física' && tipoPessoa !== 'Jurídica') {
       throw "Tipo de pessoa não informado"
    }

    const dados = data[field]

    if ( ! dados ) {
      throw tipoPessoa === 'Física'? 'CPF' : 'CNPJ' + ' não informado'
    }

    if ( tipoPessoa === 'Física' ) {
       if ( !validator.isCpf(dados)) throw 'CPF inválido'
    } else {
       if (! validator.isCnpj(dados)) throw 'CNPJ inválido'
    }

   }

  boot () {
    const Validator = use('Validator')

    Validator.extend('cpfCnpjValidate', this._Fn, 'validar cpf/cnpj')
  }
}

module.exports = ValidateCpfCnpj
