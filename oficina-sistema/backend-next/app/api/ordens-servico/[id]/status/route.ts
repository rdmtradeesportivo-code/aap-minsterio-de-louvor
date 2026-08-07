import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { respostaErroRpc } from "../../../../../lib/rpcError";
import { parseIdOrNull } from "../../../../../lib/ids";
import { SELECT_OS_DETALHE, comValorTotal } from "../../../../../lib/os";

const PERFIS_GERENCIAR = ["admin", "financeiro", "recepcao"];

type Params = { params: Promise<{ id: string }> };

/** Delega pra RPC mudar_status_os — valida a transição contra o mapa de
 * estados permitidos, bloqueia ir direto pra "faturado"/"cancelado" (têm
 * endpoint dedicado) e calcula comissão automaticamente ao entrar em
 * "concluido", tudo na mesma transação. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const osId = parseIdOrNull((await params).id);
    if (osId === null) {
      return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const { error } = await ctx.supabase.rpc("mudar_status_os", {
      p_os_id: osId,
      p_novo_status: body.novo_status,
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
