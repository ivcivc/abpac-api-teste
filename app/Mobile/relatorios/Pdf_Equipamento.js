const Redis = use('Redis')
const Drive = use('Drive')
const Helpers = use('Helpers')
const RateioServices = use('App/Services/Rateio')


class PdfEquipamento {

    async getPdfEquipamentoRateio(registro) {
        let ret= await this.addPdfEquipamentoDoRateio(registro)
        return ret
    }

    // Criar pdf do equipamento de uma pessoa de um rateio especifico
    async addPdfEquipamentoDoRateio(registro) {
        return new Promise(async (resolve, reject) => {
            try {
                const pasta = Helpers.tmpPath('rateio/equipamentos/')
				let arquivo = `equip_${registro.rateio_id}_${registro.pessoa_id}.pdf`
				arquivo = arquivo.trim()

                let PDF= await this.getArquivoPDF(pasta, arquivo)
                if (PDF) {
                    return resolve(PDF)
                }

                // gerar o pdf
                let res =
                    await new RateioServices().PDF_TodosEquipamentosRateioPorPessoa(
                        registro.pessoa_id,
                        registro.rateio_id,
                        false
                    )

                await this.sleep(200)    

                PDF= await this.getArquivoPDF(pasta, arquivo)
                if (PDF) {
                    return resolve(PDF)
                }

                // res.pasta, res.arquivo
                return reject(null)
            } catch (e) {
                return reject(null)
            }
        })
    }

    // Retorna o objeto pdf ou nulo
    async getArquivoPDF(pasta, arquivo) {
        return new Promise(async (resolve, reject) => {
            try {
                if (await Drive.exists(pasta + arquivo)) {
                    return resolve({ arquivo, pdfDoc: null, pasta }) // await Drive.get(pasta + arquivo)
                }
                throw null
            } catch (error) {
                return resolve(null)
            }
        })
    }

    sleep( milliseconds) {
        if ( !milliseconds) milliseconds= 200
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }

}

module.exports = PdfEquipamento
