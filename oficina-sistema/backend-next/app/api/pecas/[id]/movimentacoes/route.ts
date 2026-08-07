import type { NextRequest } from "next/server";
import { getAuthContext, authErrorResponse } from "../../../../../lib/auth";
import { parseIdOrNull } from "../../../../../lib/ids";

type Params = { params: Promise<{ id: string }> };

/** Histórico de movimentações de uma peça — leitura liberada pra qualquer
 * autenticado, igual ao resto de estoque (RLS: movimentacoes_estoque_select). */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);

    const pecaId = parseIdOrNull((await params).id);
    if (pecaId === null) {
      return Response.json({ detail: "Peça não encontrada" }, { status: 404 });
    }

    const { data: peca, error: pecaError } = await ctx.supabase
      .from("pecas")
      .select("id")
      .eq("id", pecaId)
      .maybeSingle();
    if (pecaError) throw pecaError;
    if (!peca) return Response.json({ detail: "Peça não encontrada" }, { status: 404 });

    const { data, error } = await ctx.supabase
      .from("movimentacoes_estoque")
      .select("*")
      .eq("peca_id", pecaId)
      .order("criado_em", { ascending: false });
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
