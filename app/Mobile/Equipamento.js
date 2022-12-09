const Model = use('App/Models/Equipamento')
const Redis = use('Redis')
const cache= require('./Cache')

class Equipamento {
    async getEquipamentos(pessoa_id) {

        let msg= "Equipamento não localizado"
        let isErro = false
		try {

			let equipamentos=[]

			let equipamentoCache = await new cache().getEquipamentos(pessoa_id)

			if ( ! equipamentoCache) {
				console.log('buscando no banco de dados....')
			  equipamentos = await Model.query().where("pessoa_id", pessoa_id).where("status", "Ativo")
				.with("pessoa")
				.with("categoria", (build) => {
					build.select("id", "ordem", "nome", "tipo", "abreviado")
				})
				.with("equipamentoProtecoes", (build) => {
				build.whereIn("status", ["Instalar", "Revisar", "Instalado", "Revisado"])
				})
				.with("equipamentoBeneficios.beneficio", (build) => {
					build.where("status", "Ativo")
				})
				.with("equipamentoRestricaos")
				.fetch()

				console.log('criando um cache de equipamentos.')
				await new cache().setEquipamentos(pessoa_id, equipamentos.rows)
				equipamentoCache= equipamentos.rows
			}


			return equipamentoCache
		} catch (e) {

            if ( isErro) {
                e.message= msg
            }

			return e
		}
	}

    async getEquipamentoQtd(pessoa_id) {
        let msg= "Equipamento não localizado"
        let isErro = false		

		try {
			let qtd = await new cache().getEquipamentoQtd(pessoa_id)

			if ( ! qtd) {
				qtd = await Model.query().where("pessoa_id", pessoa_id).where("status", "Ativo").getCount()
				await new cache().setEquipamentoQtd(pessoa_id, qtd)
			}			

			return qtd
		} catch (e) {

            if ( isErro) {
                e.message= msg
            }

			return e
		}
	}
}

module.exports = Equipamento