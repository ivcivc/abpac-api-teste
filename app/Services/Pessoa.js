"use strict";

const Model = use("App/Models/Pessoa");
const PessoaStatus = use('App/Models/PessoaStatus')
const Equipamento = use('App/Models/Equipamento')
const PendenciaServices = use("App/Services/Pendencia");
const Galeria = use('App/Models/File')
const FileConfig = use('App/Models/FileConfig')

const Database = use('Database')

class Pessoa {
  async update(ID, data, trx) {
    try {
      let pessoa = await Model.findOrFail(ID);

      delete data['status']
      delete data['cpfCnpj']

      //let pendencias= data.pendencias
      delete data['pendencias']

      pessoa.merge(data);

      await pessoa.save(trx ? trx : null);

      return pessoa;
    } catch (e) {
      throw {
        message: e.message,
        sqlMessage: e.sqlMessage,
        sqlState: e.sqlState,
        errno: e.errno,
        code: e.code
      };
    }
  }

  async add(data, trx, auth) {
    try {

      if (!trx) {
         trx = await Database.beginTransaction()
      }

      data.tipo= "Associado"

      let pendencias= data.pendencias
      delete data['pendencias']

      const pessoa = await Model.create(data, trx ? trx : null);

      const status = {pessoa_id: pessoa.id, user_id: auth.user.id, motivo: "Inclusão de Associado gerado pelo sistema.", status: "Ativo"}
      await PessoaStatus.create(status, trx ? trx : null)

      /*if ( pendencias) {
        for (let i= 0; i < pendencias.length; i++) {
            pendencias[i].pessoa_id= pessoa.id
          console.log('e= ', pendencias[i])
          await new PendenciaServices().add(pendencias[i], trx)
        }

      }*/

      const fileConfig = await FileConfig.query().where('modulo', "like", "Associado").fetch()

      for ( const i in fileConfig.rows) {
         const payload= {
            descricao: fileConfig.rows[i].descricao,
            modulo: fileConfig.rows[i].modulo,
            idParent: pessoa.id,
            "pessoa_id": pessoa.id,
            status: "Pendente" }
         const model = await Galeria.create(payload, trx)
      }

      await trx.commit()

      return pessoa;
    } catch (e) {
      await trx.rollback()
      throw e;
    }
  }

  async isCpfCnpj(doc) {
     console.log('rodando isCpfCnpj service')
    try {
      const pessoa = await Model.query().where('tipo', 'Associado').where("cpfCnpj", doc).fetch()

      console.log(pessoa)

//return pessoa
      return { isCpfCnpj: pessoa.rows.length > 0};
    } catch (e) {
      throw e;
    }
  }

  async get(ID) {
    try {
      const pessoa = await Model.findOrFail(ID);

      await pessoa.load('pessoaStatuses')


      return pessoa;
    } catch (e) {
      throw e;
    }
  }

  async getPasta(ID) {
   try {
     const pessoa = await Model.findOrFail(ID);

     await pessoa.loadMany(['equipamentos'])

     const users = await Model
         .query()
         .select('id', 'nome')
         //.with('pessoaStatuses')
         //.with('equipamentos')
         .with('equipamentos.ocorrencias')
         .with('equipamentos.categoria')
         .with('equipamentos.equipamentoStatuses')
         .fetch()

         return users

     /*
     const users = await Equipamento
         .query().where('id', '=', 3)
         .select('id', 'placa1','pessoa_id','categoria_id')
         //.with('pessoaStatuses')
         //.with('equipamentos')
         .with('ocorrencias')
         .with('pessoa')
         .with('categoria')
         .with('equipamentoStatuses')
         .fetch()

         return users
*/

     /*const users = await Model
         .query()
         .select('id', 'nome')
         //.with('pessoaStatuses')
         //.with('equipamentos')
         .with('equipamentos.ocorrencias')
         .with('equipamentos.categoria')
         .with('equipamentos.equipamentoStatuses')
         .fetch()

         return users*/
     const equipamentos= await Equipamento.query().where('id', '=', 8).with('ocorrencias').fetch()
     //await equipamentos.load('ocorrencias')
      return equipamentos
     /*let ee= pessoa.getRelated('equipamentos')

     let equipa= await pessoa.equipamentos().fetch()

      const tam= equipa.rows.length

     for ( let i = 0; i < tam; i++ ) {
        let e= equipa.rows[i]
        let ocorr = e.placa1 //await e.ocorrencias().fetch()
        let o= e.ocorrencias()
        let a=o
        let r= a.id
        console.log(r)
     }*/

     /*let equipamentos= pessoa.equipamentos()
     let y= await equipamentos.load('ocorrencias')*/

     return pessoa;
   } catch (e) {
     throw e;
   }
 }


  async index(payload) {
   try {

      const pessoa = Model.query();
      pessoa.where('tipo', 'like', 'Associado')
      pessoa.orderBy('nome', "asc")
      pessoa.select('id','nome', 'status')

      if (payload.where ) {
         pessoa.andWhere(payload.where[0], payload.where[1], payload.where[2])
      }

      let res= await pessoa.paginate(payload.page, payload.limit)

      return res;
    } catch (e) {
       let r=1
      throw e;
    }
  }

  async addStatus(data, trx, auth) {
   try {

     if (!trx) {
        trx = await Database.beginTransaction()
     }

     data.user_id = auth.user.id

     const pessoa = await Model.findOrFail(data.pessoa_id);
     pessoa.status= data.status
     pessoa.save(trx ? trx : null)

     const status = data
     await PessoaStatus.create(status, trx ? trx : null)

     trx.commit()

     return pessoa;
   } catch (e) {
     await trx.rollback()
     throw e;
   }
 }

}

module.exports = Pessoa;
