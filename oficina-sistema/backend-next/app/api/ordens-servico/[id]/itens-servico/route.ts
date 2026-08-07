import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { parseIdOrNull } from "../../../../../lib/ids";

const PERFIS_GERENCIAR = ["admin", "financeiro", "recepcao"];
const STATUS_ITENS_BLOQUEADOS = ["faturado", "pago", "cancelado"];

type Params = { params: Promise<{ id: string }> };

// Item de serviço não mexe em estoque — sem risco de concorrência que
// justifique uma RPC com lock, mas ainda precisa checar que a OS não está
// faturada antes de aceitar o item (mesma regra do FastAPI antigo).
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const osId = parseIdOrNull((await params).id);
    if (osId === null) {
      return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });
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

    const body = await request.json();
    if (body.funcionario_id != null) {
      const { data: funcionario, error: erroFunc } = await ctx.supabase
        .from("funcionarios")
        .select("id")
        .eq("id", body.funcionario_id)
        .maybeSingle();
      if (erroFunc) throw erroFunc;
      if (!funcionario) return Response.json({ detail: "Funcionário não encontrado" }, { status: 404 });
    }

    const { data, error } = await ctx.supabase
      .from("os_itens_servico")
      .insert({
        os_id: osId,
        descricao: body.descricao,
        valor: body.valor,
        funcionario_id: body.funcionario_id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
