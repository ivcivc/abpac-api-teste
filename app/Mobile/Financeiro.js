const Helpers = use('Helpers')
const Drive = use('Drive')

const Service = use("App/Services/Lancamento")
const CnabService = use('App/Services/Cnab')

class Financeiro {
    async localizarContaEmAberto(payload) {
        try {

            payload.tipo= 'Receita'
            payload.modulo= 'Aberto'
            payload.field_name = 'nome'
            payload.field_value_pessoa_id= payload.pessoa_id
            payload.field_status= payload.status

            const res= await new Service().localizarPor(payload)

            const arr= []
            const arrJson= res.toJSON()

            for (const key in arrJson) {
                if (Object.hasOwnProperty.call(arrJson, key)) {
                    const o = arrJson[key];
                    console.log(o.boletos.length)

                    // somente aberto que tiver boleto ativo
                    if ( o.boletos.length > 0) {
                        arr.push(o)
                    }
                    
                }
            }

            return arr

        } catch (error) {
            throw error
        }
    }

    async localizarPorAnoMes(payload) {
        try {

            payload.tipo= 'Receita'
            payload.modulo= 'AnoMes'
            payload.field_value_pessoa_id= payload.pessoa_id
            payload.anomes= payload.anomes            

            const res= await new Service().localizarPor(payload)

            return res

        } catch (error) {
            throw error
        }
    }    

	async pdfBoletoBase64( params ) {
		const data = { arquivo: params.arquivo, metodo: 'pdf-download' } // Data to be passed to job handle

		try {
			const result = await new CnabService().pdfBase64(data.arquivo)

			if (result.success) {
				return { success: true, pdfBase64: result.arquivo }
			} else {
				return null
			}
		} catch (e) {
			return null
		}
	}

	async pdfBoleto(params) {
		// Rateio - Relatorio de ocorrencias - envia cliente o pdf
		return new Promise(async (resolve, reject) => {
			try {
				const lancamento_id = params.lancamento_id
				const pasta = Helpers.tmpPath('ACBr/pdf/')
				const arquivo = `boleto_${lancamento_id}.pdf`

				const isExist = await Drive.exists(pasta + arquivo)

				if (isExist) {
					return resolve({ success:true, fullPath: pasta + arquivo})
				}
				throw { message: 'Arquivo não encontrado' }
			} catch (e) {
				reject({success: false, message: e.message})
			}
		})
	}

}

module.exports = Financeiro