/**
 * Converte string vazia/só espaços em null antes de mandar pro Postgres.
 * Sem isso, campos opcionais e únicos (ex: clientes.cpf_cnpj) armazenariam
 * "" em vez de NULL — e duas linhas sem CPF cadastrado colidiriam na
 * constraint UNIQUE ("" === "" é duplicata; múltiplos NULL não são).
 * Espelha o `_NormalizaVaziosMixin` do backend FastAPI antigo
 * (app/schemas/cliente.py e app/schemas/veiculo.py).
 */
export function vazioParaNull<T extends Record<string, unknown>>(
  obj: T,
  campos: readonly (keyof T)[]
): T {
  const copia = { ...obj };
  for (const campo of campos) {
    const valor = copia[campo];
    if (typeof valor === "string" && valor.trim() === "") {
      copia[campo] = null as T[keyof T];
    }
  }
  return copia;
}

/**
 * Escapa um valor pra uso dentro de um filtro `.or(...)` do PostgREST.
 * Vírgula e parênteses têm significado especial na sintaxe do `.or()`
 * (separam condições/agrupam) — sem isso, um termo de busca com vírgula
 * (ex.: endereço colado sem querer) quebraria o parsing do filtro em vez
 * de ser tratado como texto literal. Envolver em aspas duplas faz o
 * PostgREST tratar tudo dentro como valor literal (escapando aspas
 * internas com backslash, conforme a sintaxe documentada do PostgREST).
 */
export function escaparValorFiltroOr(valor: string): string {
  return `"${valor.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
