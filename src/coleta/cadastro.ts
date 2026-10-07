export type Cadastro = {
  co_inep: number | null; serie: number | null; idade: string
  email: string; telefone: string; autorizacao: boolean
}

// Idade como número inteiro (texto do campo); null se não for um inteiro.
const idadeNumero = (v: string) => (/^\d{1,2}$/.test(v.trim()) ? Number(v.trim()) : null)

export const precisaAutorizacao = (idade: string) => {
  const n = idadeNumero(idade)
  return n !== null && n >= 9 && n < 12
}

// Mesmas regras do servidor (iniciar_sessao); aqui só para avisar antes do envio.
export function validarCadastro(c: Cadastro): Partial<Record<keyof Cadastro, string>> {
  const e: Partial<Record<keyof Cadastro, string>> = {}
  if (c.co_inep === null) e.co_inep = 'Escolha a sua escola.'
  if (c.serie === null) e.serie = 'Escolha o seu ano.'
  const anos = idadeNumero(c.idade)
  if (!c.idade.trim()) e.idade = 'Informe a sua idade.'
  else if (anos === null || anos < 9 || anos > 18) e.idade = 'Confira a sua idade.'
  else if (anos < 12 && !c.autorizacao) e.autorizacao = 'Para responder, seu responsável precisa ter autorizado.'
  if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) e.email = 'Confira o e-mail ou deixe em branco.'
  const digitos = c.telefone.replace(/\D/g, '')
  if (c.telefone && (digitos.length < 10 || digitos.length > 11)) e.telefone = 'Use DDD + número, ou deixe em branco.'
  return e
}
