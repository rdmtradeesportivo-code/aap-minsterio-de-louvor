import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../lib/auth";
import { respostaErroRpc } from "../../../lib/rpcError";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

const SELECT_FOLHA = "*, descontos:folha_descontos(*)";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const funcionarioId = request.nextUrl.searchParams.get("funcionario_id");
    let query = ctx.supabase.from("folha_pagamento").select(SELECT_FOLHA).order("mes_referencia", { ascending: false });
    if (funcionarioId) query = query.eq("funcionario_id", Number(funcionarioId));

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}

/** Abre a folha do mês pro funcionário — delega pra RPC abrir_folha, que
 * snapshota o salario_base vigente do funcionário e bloqueia duplicata
 * pro mesmo par (funcionario_id, mes_referencia). */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const body = await request.json();
    const { data: folhaId, error } = await ctx.supabase.rpc("abrir_folha", {
      p_funcionario_id: body.funcionario_id,
      p_mes_referencia: body.mes_referencia,
    });
    if (error) return respostaErroRpc(error);

    const { data, error: erroSelect } = await ctx.supabase
      .from("folha_pagamento")
      .select(SELECT_FOLHA)
      .eq("id", folhaId)
      .single();
    if (erroSelect) throw erroSelect;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
