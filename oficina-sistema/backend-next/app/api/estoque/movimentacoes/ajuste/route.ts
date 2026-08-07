import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { respostaErroRpc } from "../../../../../lib/rpcError";

const PERFIS_GERENCIAR = ["admin", "financeiro"];

/** Movimentação de ajuste (inventário físico) — delega pra RPC
 * registrar_movimentacao_estoque, que trava a linha da peça
 * (SELECT ... FOR UPDATE) e bloqueia (VALIDATION → 400) se o ajuste
 * deixaria o estoque negativo. Essa checagem acontece dentro da mesma
 * transação que grava o novo saldo, então duas requisições concorrentes
 * nunca conseguem passar as duas na checagem ao mesmo tempo — ver a prova
 * de concorrência no histórico do projeto. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const body = await request.json();

    const { data, error } = await ctx.supabase.rpc("registrar_movimentacao_estoque", {
      p_peca_id: body.peca_id,
      p_tipo: "ajuste",
      p_quantidade: body.quantidade,
      p_motivo: body.motivo,
      p_observacao: body.observacao ?? null,
    });

    if (error) return respostaErroRpc(error);
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
