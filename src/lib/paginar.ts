// Busca todas as linhas em páginas: o PostgREST corta cada resposta em max_rows (1000 por padrão).
export async function buscarTodos<T>(buscar: (de: number, ate: number) => Promise<T[]>, tamanho = 1000): Promise<T[]> {
  const todos: T[] = []
  for (let de = 0; ; de += tamanho) {
    const pagina = await buscar(de, de + tamanho - 1)
    todos.push(...pagina)
    if (pagina.length < tamanho) return todos
  }
}
