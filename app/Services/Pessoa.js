"use strict";

const Model = use("App/Models/Pessoa");
const PessoaStatus = use('App/Models/PessoaStatus')

const Database = use('Database')

class Pessoa {
  async update(ID, data, trx) {
    try {
      let pessoa = await Model.findOrFail(ID);

      delete data['status']
      delete data['cpfCnpj']

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

      const pessoa = await Model.create(data, trx ? trx : null);

      const status = {pessoa_id: pessoa.id, user_id: auth.user.id, motivo: "Inclusão de Associado gerado pelo sistema.", status: "Ativo"}
      await PessoaStatus.create(status, trx ? trx : null)

      trx.commit()

      return pessoa;
    } catch (e) {
      await trx.rollback()
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

  async index() {
   try {
      const pessoa = await Model.query().fetch();

      return pessoa;
    } catch (e) {
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
