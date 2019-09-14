"use strict";

const Model = use("App/Models/Pessoa");

class Pessoa {
  async update(ID, data, trx) {
    try {
      let pessoa = await Model.findOrFail(ID);

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

  async add(data, trx) {
    try {
      const pessoa = await Model.create(data, trx ? trx : null);

      return pessoa;
    } catch (e) {
      throw e;
    }
  }

  async get(ID) {
    try {
      const pessoa = await Model.findOrFail(ID);

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
}

module.exports = Pessoa;
