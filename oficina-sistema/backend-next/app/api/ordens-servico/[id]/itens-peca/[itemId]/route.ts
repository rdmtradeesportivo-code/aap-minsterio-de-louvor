import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../../lib/auth";
import { respostaErroRpc } from "../../../../../../lib/rpcError";
import { parseIdOrNull } from "../../../../../../lib/ids";

const PERFIS_GERENCIAR = ["admin", "financeiro", "recepcao"];

type Params = { params: Promise<{ id: string; itemId: string }> };

/** Delega pra RPC remover_item_peca_os — estorna o estoque (trava a peça,
 * soma a quantidade de volta) na mesma transação que apaga o item. */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const { id, itemId } = await params;
    const osId = parseIdOrNull(id);
    const itemIdNum = parseIdOrNull(itemId);
    if (osId === null || itemIdNum === null) {
      return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });
    }

    const { error } = await ctx.supabase.rpc("remover_item_peca_os", {
      p_os_id: osId,
      p_item_id: itemIdNum,
    });
    if (error) return respostaErroRpc(error);
    return new Response(null, { status: 204 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
