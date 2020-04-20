'use strict'

class GerenciadorArquivoController {

   async folders({ params, request, response, auth }) {
      let r= request.all()
      console.log('folders id= ', r.id)
      let data= [
         {
            value: "Associados",
            id: "/Pasta1",
            size: 4096,
            date: 1584484610,
            type: "folder"
         },
         {
            value: "Equipamentos",
            id: "/002",
            size: 4096,
            date: 1584484610,
            type: "folder"
         }
      ]

      return data
   }

   files({ params, request, response }) {
      let p= params.id
      let r= request.all()

      let search= request.only('search')


      console.log('Files ID= ', r.id)
      console.log('seach = ', search)

      let data= [{
         value: "Test",
         id: "/Pasta1/Test",
         size: 4096,
         date: 1584484610,
         type: "folder",
      },
      {
         value: "1552253771775.jpg",
         id: "/Pasta1/1552253771775.jpg",
         size: 353365,
         date: 1584455497,
         type: "image"
      },
         {
            value: "teste.txt",
            id: "/002/teste.txt",
            size: 353365,
            date: 1584455497,
            type: "document"
         }

      ]

      return data
   }

   info() {
      return {"stats":{"free":35263373312,"total":83204141056,"used":47940767744},"features":{"preview":{"code":true,"document":true,"image":true},"meta":{"audio":true,"image":true}}}
   }

   preview({ params, request, response }) {
      let urlPdf=  "https://dl.dropboxusercontent.com/apitl/1/AWWPwmYhJzhA05n2TBcTGS7aIg0wsG7TEoJEqzCvUxecpGyDytssxjeCQDWpvNeW8VKYd8gDKgLFWki3T0shoBZfvg3MfAhMUnPAwfkyGrjnbunmYiswW2gG0icztl8ggX6BqQVknPRQ5jDrc08o-8HuEsmeU-LcJmO0U0Q5d2bBappucRM62TKSoCmMcTUcbuZtsJKbbwj8lxAyGNe7poSOe3IxkyOYqnPdqDyOYPfQC4gDUMkmkIGVthIhAuo-HdjWVC1VnVShJYBGPiqvaC0YdmecBuMPoNA2Un0x5zuxlblU_zm-6lyDmpn6yC1I8AmL05MbnRzRwcCghB2mgYDhE7MX-xLbH3_N6m_B2vPfWw"
      let url= "https://dl.dropboxusercontent.com/apitl/1/AWV1lJaDtriU0-iOklnm_XMcR1Pm9jucdZE5NeBqJsYxxXJBLnKPgk1QWGHE2SOy5e-sAUNdeBsq9lNYgr55YX7IUzl9g_6s4UuLBUYspk7oyAl8fixmlVNBCdb5bNbumCPm6hDz3NVWE9CVHPuruyfTIoOipiEjZ5pfc1jFHgbK8Y7so9oK7ZEwtcgnWcqooHPsnWvHwjNlZyU8iraWhttSImmVp9_L0buYuA03M63EAzkhLCrJS6VS3TXbj15Je867hDNLuajGZg8kkSB8FEHiLOeVT5SCeeog3m3mSRHVgoEveDhU3lQgLpdLuc8NN-5oIHUGLGta2lRsv6DIUbP_nl9QGKuvBIqEqsGlKHYV_g"

      //response.header('Content-Disposition', "attachment").send(url)
      //response.type('application/octet-stream').header('Content-Disposition', "attachment").send(url)
      //response.header('Content-Disposition', "attachment").send(url)
      response.redirect(url)
   }
   meta() {
      return {
         url: "https://dl.dropboxusercontent.com/apitl/1/AWXm33KK8rlPpaOxRIDIlymwYsR_xGmAYCtgUaVlasZG7ZgX0iQwZ3zsdu9r2QvOA4BgWQilgExsq6YPPdrTNiGNXHdR-w7oZngQg9r4hkOx7eFyYOb2jOhQbc2xgspIA8k7K5zrVvbwjh_GVIQukH2zGVFQ-mHdRkfdYhfw3cHQz48TRMz7IEzx-JrZTHXur78Yz8jRZI-aRmvQzEK2cFTqIh3NzWHi0W5Vd-_9PF_PqErotAjrWMn_rDvp932I9kpGoWmqQC0VsQLAKhx6LlEX7oIBGOX-pHNWFH-R_m4LSFsfcySD9ubpPsjZflHCgmOv475Tm1331Dj7XCws4Ii0C1BuN_Zyze6AH3pG5CvRdw",
         type: "image",
         subtype: "png"
         //link: 'https://dl.dropboxusercontent.com/apitl/1/AWUsPMkrHgSOzRWe_NQPQJOC6JTf0MxxL27j2mEOuNF9Unl2yufwWVwsSamRHvKZMkwBJw7sSdb7iVxKoXS3kj2vbj3DDMyE8t_N4zsDIZiJ97aj9BACIgydB187DXBo-bk7NtyOsZDC9TQkXN9B73Rc7K-Hx8cpMjxvWHtRjxh-h4fpW5RHqBeZ49sUbjaEphcjdcFRscRq2taLygspQ1s9_UuvNy91LDY4RWr6GO0DqeYp9iJmGdHw4BWn2eytbb66o9RgJa5590MQEWbTY_BSkgr9cI8hUy8XGSabSdRxHPau8so_PZX1JslaP1lRxKWKoRdZW0XY24uG3p7qijH5o-slG7GgFiDoB-AhMcJq6Q',
      }
   }

   direct({ params, request, response }) {
      // filename=
      //return "https://dl.dropboxusercontent.com/apitl/1/AWXm33KK8rlPpaOxRIDIlymwYsR_xGmAYCtgUaVlasZG7ZgX0iQwZ3zsdu9r2QvOA4BgWQilgExsq6YPPdrTNiGNXHdR-w7oZngQg9r4hkOx7eFyYOb2jOhQbc2xgspIA8k7K5zrVvbwjh_GVIQukH2zGVFQ-mHdRkfdYhfw3cHQz48TRMz7IEzx-JrZTHXur78Yz8jRZI-aRmvQzEK2cFTqIh3NzWHi0W5Vd-_9PF_PqErotAjrWMn_rDvp932I9kpGoWmqQC0VsQLAKhx6LlEX7oIBGOX-pHNWFH-R_m4LSFsfcySD9ubpPsjZflHCgmOv475Tm1331Dj7XCws4Ii0C1BuN_Zyze6AH3pG5CvRdw"
      //link: 'https://dl.dropboxusercontent.com/apitl/1/AWUsPMkrHgSOzRWe_NQPQJOC6JTf0MxxL27j2mEOuNF9Unl2yufwWVwsSamRHvKZMkwBJw7sSdb7iVxKoXS3kj2vbj3DDMyE8t_N4zsDIZiJ97aj9BACIgydB187DXBo-bk7NtyOsZDC9TQkXN9B73Rc7K-Hx8cpMjxvWHtRjxh-h4fpW5RHqBeZ49sUbjaEphcjdcFRscRq2taLygspQ1s9_UuvNy91LDY4RWr6GO0DqeYp9iJmGdHw4BWn2eytbb66o9RgJa5590MQEWbTY_BSkgr9cI8hUy8XGSabSdRxHPau8so_PZX1JslaP1lRxKWKoRdZW0XY24uG3p7qijH5o-slG7GgFiDoB-AhMcJq6Q',
      let urlPdf= "https://dl.dropboxusercontent.com/apitl/1/AWWPwmYhJzhA05n2TBcTGS7aIg0wsG7TEoJEqzCvUxecpGyDytssxjeCQDWpvNeW8VKYd8gDKgLFWki3T0shoBZfvg3MfAhMUnPAwfkyGrjnbunmYiswW2gG0icztl8ggX6BqQVknPRQ5jDrc08o-8HuEsmeU-LcJmO0U0Q5d2bBappucRM62TKSoCmMcTUcbuZtsJKbbwj8lxAyGNe7poSOe3IxkyOYqnPdqDyOYPfQC4gDUMkmkIGVthIhAuo-HdjWVC1VnVShJYBGPiqvaC0YdmecBuMPoNA2Un0x5zuxlblU_zm-6lyDmpn6yC1I8AmL05MbnRzRwcCghB2mgYDhE7MX-xLbH3_N6m_B2vPfWw"
      let url= "https://dl.dropboxusercontent.com/apitl/1/AWV1lJaDtriU0-iOklnm_XMcR1Pm9jucdZE5NeBqJsYxxXJBLnKPgk1QWGHE2SOy5e-sAUNdeBsq9lNYgr55YX7IUzl9g_6s4UuLBUYspk7oyAl8fixmlVNBCdb5bNbumCPm6hDz3NVWE9CVHPuruyfTIoOipiEjZ5pfc1jFHgbK8Y7so9oK7ZEwtcgnWcqooHPsnWvHwjNlZyU8iraWhttSImmVp9_L0buYuA03M63EAzkhLCrJS6VS3TXbj15Je867hDNLuajGZg8kkSB8FEHiLOeVT5SCeeog3m3mSRHVgoEveDhU3lQgLpdLuc8NN-5oIHUGLGta2lRsv6DIUbP_nl9QGKuvBIqEqsGlKHYV_g"

         //response.type('application/octet-stream').header('Content-Disposition', "attachment").send( 'filename= "' + url + '"')
      //response.header('Content-Disposition', "inline").send(  'filename= "' + url + '"' )
      response.redirect(url)

      //response.header('Content-Disposition', "inline").send(url)

   }

}

module.exports = GerenciadorArquivoController
