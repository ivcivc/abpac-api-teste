"use strict";

const moment = require("moment");
const crypto = require("crypto");
const User = use("App/Models/User");
const Mail = use("Mail");
const Env = use("Env");

class ForgotPasswordController {
  async store({ request, response }) {
    try {
      const email = request.input("email");
      const user = await User.findByOrFail("email", email);

      user.token = crypto.randomBytes(10).toString("hex");
      user.token_created_at = new Date();
      await user.save();

      await Mail.send(
        ["emails.forgot_password"],
        {
          email,
          token: user.token,
          link: `${request.input("redirect_url")}/?id=${user.token}`
        },
        message => {
          message
            .to(user.email)
            .from(Env.get('MAIL_EMPRESA'), Env.get('MAIL_EMPRESA_SLUG'))
            .subject("Recuperação de senha");
        }
      );
    } catch (err) {
      return response
        .status(err.status)
        .send("Algo não deu certo, esse email existe?");
    }
  }

  async update({ request, response }) {
    try {
      const { token, password } = request.all();

      const user = await User.findByOrFail("token", token);

      const tokenExpired = moment()
        .subtract("2", "days")
        .isAfter(user.token_created_at);

      if (tokenExpired) {
        return response
          .status(401)
          .send("O token de recuperação está expirado");
      }

      user.token = null;
      user.token_created_at = null;

      user.password = password;

      await user.save();
    } catch (err) {
      return response
        .status(err.status)
        .send("Deu algo errado ao resetar sua senha");
    }
  }
}

module.exports = ForgotPasswordController;
