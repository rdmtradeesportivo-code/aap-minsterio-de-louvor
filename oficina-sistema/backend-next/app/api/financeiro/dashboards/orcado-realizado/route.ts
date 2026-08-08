import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { respostaErroRpc } from "../../../../../lib/rpcError";
import { parseMes } from "../../../../../lib/datas";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const mes = parseMes(request.nextUrl.searchParams.get("mes"));
    const { data, error } = await ctx.supabase.rpc("dashboard_orcado_realizado", { p_mes: mes });
    if (error) return respostaErroRpc(error);
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
