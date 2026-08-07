// Espelha o `@computed_field estoque_baixo` do Pydantic antigo
// (app/schemas/estoque.py) — nunca persistido, sempre calculado na
// resposta a partir de estoque_atual/estoque_minimo.
export function comEstoqueBaixo<T extends { estoque_atual: unknown; estoque_minimo: unknown }>(
  peca: T
): T & { estoque_baixo: boolean } {
  return {
    ...peca,
    estoque_baixo: Number(peca.estoque_atual) <= Number(peca.estoque_minimo),
  };
}
