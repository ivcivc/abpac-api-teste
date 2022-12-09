const Redis = use('Redis')

class Cache {

    async criarMobile() {
        //const o= await Redis.get('mobile')

        //if (!o) {
            //await Redis.set('mobile', JSON.stringify({}))
        //}        

    }

    async criarPessoaRoot(pessoa_id) {

        //await this.criarMobile()

        const o= await Redis.hmget('mobile', pessoa_id)

        if ( o[0] === null) {
            await Redis.hmset('mobile', pessoa_id, JSON.stringify({ id: pessoa_id}))
        }

    }

    async getPessoa(pessoa_id) {

        await this.criarPessoaRoot(pessoa_id)

        const o= await Redis.hmget('mobile', pessoa_id)

        if ( o[0] == null) return null

        let json= JSON.parse(o[0])

        let r= json['pessoa']

        if ( r) {
            return r
        }

        let b= json

        return null
    }

    async setPessoa(pessoa_id, pessoa) {

        await this.criarPessoaRoot(pessoa_id)
        
        const o= await Redis.hmget('mobile', pessoa_id)

        let json= JSON.parse(o[0])

        json.pessoa= pessoa

        await Redis.hmset('mobile', pessoa_id, JSON.stringify(json))

    }    

    async getEquipamentos(pessoa_id) {

        await this.criarPessoaRoot(pessoa_id)

        const o= await Redis.hmget('mobile', pessoa_id)

        if ( o[0] == null) return null

        let json= JSON.parse(o[0])

        let r= json['equipamentos']

        return r
    }

    async setEquipamentos(pessoa_id, arr) {

        await this.criarPessoaRoot(pessoa_id)
        
        const o= await Redis.hmget('mobile', pessoa_id)

        let json= JSON.parse(o[0])

        json.equipamentos= arr

        await Redis.hmset('mobile', pessoa_id, JSON.stringify(json))

    }

    async getEquipamentoQtd(pessoa_id) {

        await this.criarPessoaRoot(pessoa_id)

        const o= await Redis.hmget('mobile', pessoa_id)

        if ( o[0] == null) return null

        let json= JSON.parse(o[0])

        let r= json['equipamentoQtd']

        return r
    }

    async setEquipamentoQtd(pessoa_id, qtd) {

        await this.criarPessoaRoot(pessoa_id)
        
        const o= await Redis.hmget('mobile', pessoa_id)

        let json= JSON.parse(o[0])

        json.equipamentoQtd= qtd

        await Redis.hmset('mobile', pessoa_id, JSON.stringify(json))

    }    
}

module.exports = Cache