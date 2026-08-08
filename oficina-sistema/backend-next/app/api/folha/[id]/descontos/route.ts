import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { respostaErroRpc } from "../../../../../lib/rpcError";
import { parseIdOrNull } from "../../../../../lib/ids";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const folhaId = parseIdOrNull((await params).id);
    if (folhaId === null) {
      return Response.json({ detail: "Folha não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const { data: descontoId, error } = await ctx.supabase.rpc("adicionar_desconto_folha", {
      p_folha_id: folhaId,
      p_descricao: body.descricao,
      p_valor: body.valor,
    });
    if (error) return respostaErroRpc(error);

    const { data, error: erroSelect } = await ctx.supabase
      .from("folha_descontos")
      .select("*")
      .eq("id", descontoId)
      .single();
    if (erroSelect) throw erroSelect;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
