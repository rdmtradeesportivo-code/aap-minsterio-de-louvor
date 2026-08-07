import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../../lib/auth";
import { parseIdOrNull } from "../../../../../../lib/ids";

const PERFIS_GERENCIAR = ["admin", "financeiro", "recepcao"];
const STATUS_ITENS_BLOQUEADOS = ["faturado", "pago", "cancelado"];

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const { id, itemId } = await params;
    const osId = parseIdOrNull(id);
    const itemIdNum = parseIdOrNull(itemId);
    if (osId === null || itemIdNum === null) {
      return Response.json({ detail: "Item não encontrado" }, { status: 404 });
    }

    const { data: os, error: erroOs } = await ctx.supabase
      .from("ordens_servico")
      .select("id, status")
      .eq("id", osId)
      .maybeSingle();
    if (erroOs) throw erroOs;
    if (!os) return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });
    if (STATUS_ITENS_BLOQUEADOS.includes(os.status)) {
      return Response.json(
        { detail: "OS já faturada — itens não podem mais ser alterados" },
        { status: 400 }
      );
    }

    const { data, error } = await ctx.supabase
      .from("os_itens_servico")
      .delete()
      .eq("id", itemIdNum)
      .eq("os_id", osId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ detail: "Item não encontrado" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
