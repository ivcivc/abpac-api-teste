/*
Fonte: https://github.com/luiz-simples/boleto-bancoob-sicoob/blob/master/src/bacoob.func.js

*/

function substr(string, ini, fim) {
   return String(string).substr(ini, fim);
}

function strlen(string) {
   return String(string).length;
}

function montaNossoNumero(nossoNumero, sequencia) {
   let num;
   let constante;

   sequencia= '40920000464228' + nossoNumero.toString().padStart(7, '0')

   let cont      = 0;
   let calculoDv = 0;

   for (num=0; num<=strlen(sequencia); num++) {
       cont++;

       if(cont === 1) constante = 3;
       if(cont === 2) constante = 1;
       if(cont === 3) constante = 9;

       if(cont === 4) {
           constante = 7;
           cont      = 0;
       }

       calculoDv = calculoDv + (parseInt(substr(sequencia, num, 1) || 0, 10) * constante);
   }

   let resto = calculoDv % 11;
   let dv    = 11 - resto;

   if (dv === 0) dv = 0;
   //if (dv === 1) dv = 0;
   if (dv   > 9) dv = 0;

   return String(nossoNumero).concat(dv);
}



module.exports= montaNossoNumero
