// A RPC registrar_movimentacao_estoque sinaliza erros de negócio com
// RAISE EXCEPTION 'CODIGO: mensagem legível' — aqui a gente separa o
// prefixo (que vira o status HTTP) da mensagem (que vira o `detail`,
// no mesmo formato que o resto da API já usa).
const STATUS_POR_CODIGO: Record<string, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  VALIDATION: 400,
};

export function respostaErroRpc(error: { message: string }): Response {
  const match = /^([A-Z_]+): ([\s\S]+)$/.exec(error.message);
  if (match) {
    const [, codigo, mensagem] = match;
    const status = STATUS_POR_CODIGO[codigo];
    if (status) {
      return Response.json({ detail: mensagem }, { status });
    }
  }
  console.error("Erro inesperado na RPC:", error.message);
  return Response.json({ detail: "Erro interno do servidor." }, { status: 500 });
}
