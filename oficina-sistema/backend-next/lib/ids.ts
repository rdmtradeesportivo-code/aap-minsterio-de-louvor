/**
 * Converte um segmento de rota dinâmica (sempre string) num id numérico
 * válido, ou `null` se não for um inteiro positivo. O FastAPI antigo
 * validava isso automaticamente pelo tipo `int` no path param (422 em
 * caso contrário); aqui tratamos como "não encontrado" (404) — mais
 * simples e o efeito prático pro frontend é o mesmo (nunca acha o
 * registro com um id inválido).
 */
export function parseIdOrNull(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}
