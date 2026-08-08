import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../../lib/auth";
import { respostaErroRpc } from "../../../../../../lib/rpcError";
import { parseIdOrNull } from "../../../../../../lib/ids";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const contaId = parseIdOrNull((await params).id);
    if (contaId === null) {
      return Response.json({ detail: "Conta a receber não encontrada" }, { status: 404 });
    }

    const { error } = await ctx.supabase.rpc("marcar_conta_receber_recebida", { p_id: contaId });
    if (error) return respostaErroRpc(error);

    const { data, error: erroSelect } = await ctx.supabase
      .from("contas_receber")
      .select("*")
      .eq("id", contaId)
      .single();
    if (erroSelect) throw erroSelect;
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
