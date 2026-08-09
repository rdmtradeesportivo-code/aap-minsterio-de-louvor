/**
 * Converte um filtro `?mes=YYYY-MM` (ou ausente) num literal `YYYY-MM-01`
 * pronto pra mandar como parâmetro `date` de uma RPC — espelha
 * `_parse_mes` do FastAPI antigo (app/routers/dashboards.py e
 * app/routers/metas_orcamento.py), que sempre normaliza pro dia 1.
 */
export function parseMes(valor: string | null): string {
  if (!valor) {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  }
  const [ano, mes] = valor.split("-");
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

/**
 * Espelha `_periodo_do_mes` do FastAPI antigo (app/routers/relatorios.py):
 * devolve [inicio, fim) — início é o dia 1 do mês pedido (ou do mês atual,
 * se `mes` vier vazio), fim é o dia 1 do mês seguinte (exclusivo).
 */
export function periodoDoMes(valor: string | null): { inicio: string; fim: string } {
  const inicio = parseMes(valor);
  const [ano, mes] = inicio.split("-").map(Number);
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const fim = `${proximoAno}-${String(proximoMes).padStart(2, "0")}-01`;
  return { inicio, fim };
}
