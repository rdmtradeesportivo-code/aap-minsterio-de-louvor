import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { respostaErroRpc } from "../../../../../lib/rpcError";

const PERFIS_GERENCIAR = ["admin", "financeiro"];

/** Movimentação de entrada (compra) — delega pra RPC
 * registrar_movimentacao_estoque, que trava a linha da peça
 * (SELECT ... FOR UPDATE) antes de checar/gravar, gera o lançamento em
 * contas_pagar e atualiza o custo de compra vigente da peça, tudo numa
 * única transação atômica dentro do banco. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const body = await request.json();

    const { data, error } = await ctx.supabase.rpc("registrar_movimentacao_estoque", {
      p_peca_id: body.peca_id,
      p_tipo: "entrada",
      p_quantidade: body.quantidade,
      p_custo_unitario: body.custo_unitario ?? null,
      p_fornecedor_id: body.fornecedor_id ?? null,
      p_vencimento: body.vencimento ?? null,
      p_categoria_id: body.categoria_id ?? null,
      p_centro_custo_id: body.centro_custo_id ?? null,
      p_observacao: body.observacao ?? null,
    });

    if (error) return respostaErroRpc(error);
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
