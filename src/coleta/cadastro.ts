export type Cadastro = {
  co_inep: number | null; serie: number | null; nascimento: string
  email: string; telefone: string; autorizacao: boolean
}

const DATA = /^\d{4}-\d{2}-\d{2}$/

export function idade(nascimentoISO: string, hoje: Date): number {
  const [a, m, d] = nascimentoISO.split('-').map(Number)
  let anos = hoje.getFullYear() - a
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos--
  return anos
}

export const precisaAutorizacao = (nascimentoISO: string, hoje: Date) =>
  DATA.test(nascimentoISO) && idade(nascimentoISO, hoje) < 12

// Mesmas regras do servidor (iniciar_sessao); aqui só para avisar antes do envio.
export function validarCadastro(c: Cadastro, hoje: Date): Partial<Record<keyof Cadastro, string>> {
  const e: Partial<Record<keyof Cadastro, string>> = {}
  if (c.co_inep === null) e.co_inep = 'Escolha a sua escola.'
  if (c.serie === null) e.serie = 'Escolha o seu ano.'
  if (!DATA.test(c.nascimento)) e.nascimento = 'Informe a sua data de nascimento.'
  else {
    const anos = idade(c.nascimento, hoje)
    if (anos < 9 || anos > 18) e.nascimento = 'Confira a sua data de nascimento.'
    else if (anos < 12 && !c.autorizacao) e.autorizacao = 'Para responder, seu responsável precisa ter autorizado.'
  }
  if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) e.email = 'Confira o e-mail ou deixe em branco.'
  const digitos = c.telefone.replace(/\D/g, '')
  if (c.telefone && (digitos.length < 10 || digitos.length > 11)) e.telefone = 'Use DDD + número, ou deixe em branco.'
  return e
}
