const Service = use("App/Services/Lancamento")

class Financeiro {
    async localizarPor(payload) {
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
}

module.exports = Financeiro