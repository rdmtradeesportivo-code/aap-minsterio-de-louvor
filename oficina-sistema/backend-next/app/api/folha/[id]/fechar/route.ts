import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { respostaErroRpc } from "../../../../../lib/rpcError";
import { parseIdOrNull } from "../../../../../lib/ids";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

/** Delega pra RPC fechar_folha — trava a linha da folha (SELECT ... FOR
 * UPDATE), soma comissões ainda não vinculadas a nenhuma folha no período
 * e descontos, gera a conta_pagar da folha e vincula as comissões, tudo
 * atomicamente. Ver a migration etapa6_financeiro_rpcs para a prova de
 * concorrência (fechamento não pode ser reprocessado). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const folhaId = parseIdOrNull((await params).id);
    if (folhaId === null) {
      return Response.json({ detail: "Folha não encontrada" }, { status: 404 });
    }

    const { error } = await ctx.supabase.rpc("fechar_folha", { p_folha_id: folhaId });
    if (error) return respostaErroRpc(error);

    const { data, error: erroSelect } = await ctx.supabase
      .from("folha_pagamento")
      .select("*, descontos:folha_descontos(*)")
      .eq("id", folhaId)
      .single();
    if (erroSelect) throw erroSelect;
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
