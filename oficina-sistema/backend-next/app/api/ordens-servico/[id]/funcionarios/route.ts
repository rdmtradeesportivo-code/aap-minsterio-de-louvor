import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { parseIdOrNull } from "../../../../../lib/ids";

const PERFIS_GERENCIAR = ["admin", "financeiro", "recepcao"];

type Params = { params: Promise<{ id: string }> };

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
      .select("id")
      .eq("id", osId)
      .maybeSingle();
    if (erroOs) throw erroOs;
    if (!os) return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });

    const body = await request.json();
    const { data: funcionario, error: erroFunc } = await ctx.supabase
      .from("funcionarios")
      .select("id")
      .eq("id", body.funcionario_id)
      .maybeSingle();
    if (erroFunc) throw erroFunc;
    if (!funcionario) return Response.json({ detail: "Funcionário não encontrado" }, { status: 404 });

    const { data, error } = await ctx.supabase
      .from("os_funcionarios")
      .insert({ os_id: osId, funcionario_id: body.funcionario_id, papel: body.papel ?? null })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
