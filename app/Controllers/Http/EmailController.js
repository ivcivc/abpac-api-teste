'use strict'

const htmlToPdf = require('html-to-pdf')
htmlToPdf.setInputEncoding('UTF-8');

const Mail = use('Mail')
const Participante = use('App/Models/Pessoa')

const Env = use('Env')
//const queue = require('queue')
const Helpers = use('Helpers')

class EmailController {

  async enviar( {request, response, view})  {
   const _MAIL_EMPRESA = Env.get('MAIL_EMPRESA')

    let html= await view.render('emails.informativo',{
      id: 1234,
      nome: "IVAN CARLOS ARAUJO DE OLIVEIRA",
      equipamento: 'MERCEDES BENZ LS-1935 INTERCOOLER',
      ano_modelo: '1987/1988',
      chassi: '9BSTH080483L3JL',
      placa: 'GUX-1215',
      valorInformado: '1.236,36',
      enquadramento: 'QUALQUER',
      rcf: 'PLANO B',
      assist24h: 'NÃO'
    })

    const fs = require("fs");
    const path = require("path");
    const { createPDF } = require("html-to-pdf-studio");

    const fileName = "invoide.pdf";
    const outputPath = Helpers.tmpPath("example");

    if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath);

    const pdfOptions = {
        format: "A4",
        headerTemplate: "<p></p>",
        footerTemplate: "<p></p>",
        displayHeaderFooter: false,
        margin: {
            top: "5px",
            bottom: "5px",
            left: "8px"
        },
        printBackground: true,
        path: path.join(outputPath, fileName)
    };

    (async () => {
        await createPDF(html, pdfOptions);
    })();


   /* const htmlToPDF = new HTMLToPDF(`
    <div>Hello world</div>
  `);*/

   const sendMail= function() {
      /*await Mail.send(
         ['emails.informativo'],
         {
         nome: "Ivan Oliveira"
         },
         message => {
         message
            .to(_MAIL_EMPRESA)
            .from("sistemas@abpac.com.br")
            .subject('titulo do email')
            //.attach(Helpers.tmpPath('abpac-requirimento.pdf'))
            .attachData(arquivo, 'hello.txt')
            .attachData(buffer, 'hello.pdf')
         }
      )*/
   }

   /*htmlToPdf.convertHTMLString(arquivo, Helpers.tmpPath('destination.pdf'),
      function (error, success) {
            if (error) {
               console.log('Oh noes! Errorz!');
               console.log(error);
            } else {
               console.log('Woot! Success!');
               console.log(success);
            }
      }
   );*/

  /*htmlToPDF.convert()
    .then((buffer) => {
      // do something with the PDF file buffer
      sendMail()
    })
    .catch((err) => {
       console.log(err)
      // do something on error
    });*/




    /*return view.render('emails.informativo',{
      nome: "Ivan Oliveira"
    })*/

    response.status(200).send(html)


  }

  async dispararEmailInformativo ({ request, response }) {
    const payload = request.all()
    const evento_id = payload.id

    const eventoModel = await Evento.findOrFail(evento_id)

    await new ServiceEvento().update(eventoModel.id, payload)

    const _MAIL_EMPRESA = Env.get('MAIL_EMPRESA')
    const participante = await Participante.query()
      .with('pessoa')
      .with('evento')
      .where('evento_id', '=', evento_id)
      .andWhere('status', '=', 'ATIVO')
      .fetch()
    /*
    const q = queue()
    let lista = []

    for (let a = 0; a < participante.rows.length; a++) {
      let r = await participante.rows[a].pessoa().fetch()
      let evento = await participante.rows[a].evento().fetch()
      q.push(async () => {
        return new Promise(async function (resolve, reject) {
          lista.push(
            await Mail.send(
              ['emails.informativo'],
              {
                emailInformativo: evento.emailInformativo
              },
              message => {
                message
                  .to('ivan.a.oliveira@terra.com.br')
                  .from(r.email)
                  .subject(evento.emailInformativoTitulo)
              }
            )
          )

          console.log('resolvendo ', a)
          resolve()
        })
      })
    }

    q.timeout = 1000

    q.on('success', function (result, job) {
      console.log('job finished processing:', job.toString().replace(/\n/g, ''))
    })

    q.on('timeout', function (next, job) {
      console.log('job timed out:', job.toString().replace(/\n/g, ''))
      next()
    })

    console.log('startando ')
    q.start(function (err) {
      if (err) throw err
      console.log('all done:', lista)
    })
*/

    try {
      for (let a = 0; a < participante.rows.length; a++) {
        console.log('for ', a)
        //let r = await participante.rows[a].pessoa().fetch()
        //let evento = await participante.rows[a].evento().fetch()
        console.log('enviando email nr. ', a)
        await Mail.send(
          ['emails.informativo'],
          {
            nome: "Ivan Oliveira"
          },
          message => {
            message
              .to(_MAIL_EMPRESA)
              .from("sistemas@abpac.com.br")
              .subject('titulo do email')
          }
        )
      }

      response.status(200).send('ok')
    } catch (e) {
      response.status(400).send('Ocorreu uma falha no disparo de email.')
    }
  }
}

module.exports = EmailController
