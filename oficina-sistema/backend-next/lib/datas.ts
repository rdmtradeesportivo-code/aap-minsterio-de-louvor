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
