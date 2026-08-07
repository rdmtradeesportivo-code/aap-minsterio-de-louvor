import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { respostaErroRpc } from "../../../../../lib/rpcError";
import { parseIdOrNull } from "../../../../../lib/ids";
import { SELECT_OS_DETALHE, comValorTotal } from "../../../../../lib/os";

// Faturar é ação financeira — diferente de todo o resto do módulo (que
// recepção também gerencia), aqui é só admin/financeiro, igual o
// FastAPI antigo (`faturar_dep`).
const PERFIS_FATURAR = ["admin", "financeiro"];

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_FATURAR);

    const osId = parseIdOrNull((await params).id);
    if (osId === null) {
      return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { error } = await ctx.supabase.rpc("faturar_os", {
      p_os_id: osId,
      p_numero_parcelas: body.numero_parcelas ?? 1,
    });
    if (error) return respostaErroRpc(error);

    const { data, error: erroSelect } = await ctx.supabase
      .from("ordens_servico")
      .select(SELECT_OS_DETALHE)
      .eq("id", osId)
      .single();
    if (erroSelect) throw erroSelect;
    return Response.json(comValorTotal(data));
  } catch (err) {
    return authErrorResponse(err);
  }
}
