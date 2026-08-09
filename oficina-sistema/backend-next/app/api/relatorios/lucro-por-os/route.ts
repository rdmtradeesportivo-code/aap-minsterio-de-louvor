import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";
import { respostaErroRpc } from "../../../../lib/rpcError";
import { periodoDoMes } from "../../../../lib/datas";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

/** Custo de peças SEMPRE de os_itens_peca.custo_unitario (snapshot no
 * momento da baixa) — a RPC nunca lê pecas.custo_compra (custo atual),
 * então o lucro histórico de uma OS não muda se o custo de compra da
 * peça for atualizado depois. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const { inicio, fim } = periodoDoMes(request.nextUrl.searchParams.get("mes"));
    const { data, error } = await ctx.supabase.rpc("relatorio_lucro_por_os", { p_inicio: inicio, p_fim: fim });
    if (error) return respostaErroRpc(error);
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
