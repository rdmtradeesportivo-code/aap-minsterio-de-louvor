import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";
import { respostaErroRpc } from "../../../../lib/rpcError";
import { parseMes } from "../../../../lib/datas";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const mesReferencia = request.nextUrl.searchParams.get("mes_referencia");
    let query = ctx.supabase.from("metas_orcamento").select("*").order("mes_referencia", { ascending: false });
    if (mesReferencia) query = query.eq("mes_referencia", parseMes(mesReferencia));

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const body = await request.json();
    const { data: metaId, error } = await ctx.supabase.rpc("criar_meta_orcamento", {
      p_categoria_id: body.categoria_id,
      p_mes_referencia: body.mes_referencia,
      p_valor_meta: body.valor_meta,
    });
    if (error) return respostaErroRpc(error);

    const { data, error: erroSelect } = await ctx.supabase
      .from("metas_orcamento")
      .select("*")
      .eq("id", metaId)
      .single();
    if (erroSelect) throw erroSelect;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
