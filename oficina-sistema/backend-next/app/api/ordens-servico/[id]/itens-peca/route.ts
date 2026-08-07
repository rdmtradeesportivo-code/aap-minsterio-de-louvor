import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { respostaErroRpc } from "../../../../../lib/rpcError";
import { parseIdOrNull } from "../../../../../lib/ids";

const PERFIS_GERENCIAR = ["admin", "financeiro", "recepcao"];

type Params = { params: Promise<{ id: string }> };

/** Delega pra RPC adicionar_item_peca_os, que trava a peça (SELECT ... FOR
 * UPDATE) antes de checar/decrementar o estoque na mesma transação que
 * grava o item — ver prova de corrida real no README. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const osId = parseIdOrNull((await params).id);
    if (osId === null) {
      return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const { data, error } = await ctx.supabase.rpc("adicionar_item_peca_os", {
      p_os_id: osId,
      p_peca_id: body.peca_id,
      p_quantidade: body.quantidade,
      p_preco_unitario_venda: body.preco_unitario_venda ?? null,
    });
    if (error) return respostaErroRpc(error);
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
