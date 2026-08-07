import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../lib/auth";
import { respostaErroRpc } from "../../../lib/rpcError";
import { SELECT_OS_DETALHE, comValorTotal } from "../../../lib/os";

const PERFIS_GERENCIAR = ["admin", "financeiro", "recepcao"];

// Visibilidade (mecânico só vê as OS em que está envolvido) é inteiramente
// responsabilidade da RLS (`ordens_servico_select` -> `pode_ver_os`) — a
// rota não filtra nada por perfil, igual o FastAPI antigo delegava pra
// `_query_visivel`.
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);

    const statusFiltro = request.nextUrl.searchParams.get("status_filtro");

    let query = ctx.supabase.from("ordens_servico").select(SELECT_OS_DETALHE).order("numero", { ascending: false });
    if (statusFiltro) {
      query = query.eq("status", statusFiltro);
    }

    const { data, error } = await query;
    if (error) throw error;
    return Response.json((data ?? []).map(comValorTotal));
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const body = await request.json();
    const { data: osId, error } = await ctx.supabase.rpc("criar_os", {
      p_cliente_id: body.cliente_id,
      p_veiculo_id: body.veiculo_id,
      p_prazo_estimado: body.prazo_estimado ?? null,
      p_forma_pagamento: body.forma_pagamento ?? null,
    });
    if (error) return respostaErroRpc(error);

    const { data, error: erroSelect } = await ctx.supabase
      .from("ordens_servico")
      .select(SELECT_OS_DETALHE)
      .eq("id", osId)
      .single();
    if (erroSelect) throw erroSelect;

    return Response.json(comValorTotal(data), { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
