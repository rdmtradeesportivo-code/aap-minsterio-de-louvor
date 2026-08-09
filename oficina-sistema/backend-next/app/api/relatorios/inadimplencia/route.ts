import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";
import { respostaErroRpc } from "../../../../lib/rpcError";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

/** Não depende de mês — mostra todas as contas a receber vencidas e não
 * pagas, de qualquer período. Uma OS cancelada nunca gera contas_receber
 * (cancelar_os só é permitido antes do faturamento), então este
 * relatório exclui OS canceladas por construção. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const { data, error } = await ctx.supabase.rpc("relatorio_inadimplencia");
    if (error) return respostaErroRpc(error);
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
