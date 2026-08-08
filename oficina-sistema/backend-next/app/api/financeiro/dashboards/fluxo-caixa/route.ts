import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { respostaErroRpc } from "../../../../../lib/rpcError";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const dataInicioParam = request.nextUrl.searchParams.get("data_inicio");
    const dataFimParam = request.nextUrl.searchParams.get("data_fim");
    const hoje = new Date();
    const inicio = dataInicioParam ?? isoDate(new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000));
    const fim = dataFimParam ?? isoDate(new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000));

    const { data, error } = await ctx.supabase.rpc("dashboard_fluxo_caixa", {
      p_inicio: inicio,
      p_fim: fim,
    });
    if (error) return respostaErroRpc(error);
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
