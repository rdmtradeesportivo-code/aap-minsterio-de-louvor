import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";
import { respostaErroRpc } from "../../../../lib/rpcError";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

/** Contas a receber são geradas automaticamente ao faturar uma OS (Etapa
 * 5, RPC faturar_os) — aqui só listagem + baixa (marcar como recebida). */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const { error: erroUpdate } = await ctx.supabase.rpc("atualizar_status_financeiro_vencidos");
    if (erroUpdate) return respostaErroRpc(erroUpdate);

    const statusFiltro = request.nextUrl.searchParams.get("status_filtro");
    const clienteId = request.nextUrl.searchParams.get("cliente_id");

    let query = ctx.supabase.from("contas_receber").select("*").order("vencimento");
    if (statusFiltro) query = query.eq("status", statusFiltro);
    if (clienteId) query = query.eq("cliente_id", Number(clienteId));

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
