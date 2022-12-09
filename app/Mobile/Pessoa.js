const Model = use('App/Models/Pessoa')
const Redis = use('Redis')
const cache= require('./Cache')

class Pessoa {
    async getPessoa(pessoa_id) {
        let msg= "Associado não localizado"
        let isErro = false
		try {

			let pessoa=null

			let PessoaCache = await new cache().getPessoa(pessoa_id)

            isErro= true

			if ( ! PessoaCache) {
			    pessoa = await Model.findOrFail(pessoa_id)

                const o= pessoa.toJSON()

				await new cache().setPessoa(pessoa_id, o)
				PessoaCache= o
			}

			return PessoaCache
		} catch (e) {

            if ( isErro) {
                e.message= msg
            }

			return e
		}
	}

}

module.exports = Pessoa