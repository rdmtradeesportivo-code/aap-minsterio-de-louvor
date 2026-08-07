/**
 * `valor_total` de uma OS nunca é uma coluna lida de volta — é sempre
 * recalculado a partir dos itens já carregados, mesma regra do
 * `calcular_valor_total` do FastAPI antigo (a coluna `ordens_servico.
 * valor_total` existe só por compatibilidade de schema, a aplicação nunca
 * lê nem escreve nela).
 */
export function valorTotalOs(itensPeca: any[], itensServico: any[]): number {
  const totalPecas = (itensPeca ?? []).reduce(
    (soma, item) => soma + Number(item.quantidade) * Number(item.preco_unitario_venda),
    0
  );
  const totalServicos = (itensServico ?? []).reduce((soma, item) => soma + Number(item.valor), 0);
  return Math.round((totalPecas + totalServicos) * 100) / 100;
}

/** Select usado tanto na listagem quanto no detalhe — resumo de
 * cliente/veículo embutido (liberado mesmo pro mecânico via a policy
 * `*_select_via_os`, ver migration). */
export const SELECT_OS_RESUMO =
  "*, cliente:clientes(id,nome,telefone), veiculo:veiculos(id,placa,modelo,marca), itens_peca:os_itens_peca(*), itens_servico:os_itens_servico(*)" as const;

// Não usa `SELECT_OS_RESUMO + "..."` de propósito: concatenar widenaria o
// tipo de volta pra `string` (perdendo o literal), o que faz o supabase-js
// degradar o retorno de `.select()` pra `GenericStringError` na checagem de
// tipos. Repetir o literal completo mantém o tipo específico.
export const SELECT_OS_DETALHE =
  "*, cliente:clientes(id,nome,telefone), veiculo:veiculos(id,placa,modelo,marca), itens_peca:os_itens_peca(*), itens_servico:os_itens_servico(*), funcionarios:os_funcionarios(*), fotos:os_fotos(*), status_log:os_status_log(*)" as const;

export function comValorTotal<T extends { itens_peca: any[]; itens_servico: any[] }>(
  os: T
): T & { valor_total: number } {
  return { ...os, valor_total: valorTotalOs(os.itens_peca, os.itens_servico) };
}
