const validationMessages = {
   max(field, validation, args) {
      return `Este campo deve ter no máximo ${args} characteres.`
   },
   min(field, validation, args) {
      return `Este campo deve ter pelo menos ${args} characteres`
   },
   array: 'Este campo deve ser uma matriz',
   boolean: 'Este campo deve ser um booleano',
   date: 'Este campo deve ser uma data',
   required: 'Este campo é obrigatório',
   float: 'Este campo deve ser um float',
   integer: 'Este campo deve ser um número inteiro',
   number: 'Este campo deve ser um número',
   range(field, validation, args) {
      return `Este campo deve estar entre ${args[0]} e ${args[1]}`
   },
   object: 'Este campo deve ser um objeto',
   equals(field, validation, args) {
      return `"Este campo deve ser igual a ${args}" `
   },
   email: 'Este campo deve ser um email',
   ip: 'Este campo deve ser um ip',
   ipv4: 'This field must be an ipv4',
   ipv6: 'This field must be an ipv6',
   json: 'Este campo deve ser um json',
   regex: 'Este campo é inválido',
   string: 'Este campo deve ser um string',
   url: 'Este campo deve ser uma URL válida'
}

module.exports = validationMessages
