import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";
import { respostaErroRpc } from "../../../../lib/rpcError";
import { periodoDoMes } from "../../../../lib/datas";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const { inicio, fim } = periodoDoMes(request.nextUrl.searchParams.get("mes"));
    const { data, error } = await ctx.supabase.rpc("relatorio_faturamento", { p_inicio: inicio, p_fim: fim });
    if (error) return respostaErroRpc(error);
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
