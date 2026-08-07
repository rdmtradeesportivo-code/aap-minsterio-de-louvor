import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";
import { parseIdOrNull } from "../../../../lib/ids";

const PERFIS_GERENCIAR = ["admin", "financeiro"];

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const funcionarioId = parseIdOrNull((await params).id);
    if (funcionarioId === null) {
      return Response.json({ detail: "Funcionário não encontrado" }, { status: 404 });
    }

    const payload = await request.json();
    const { data, error } = await ctx.supabase
      .from("funcionarios")
      .update(payload)
      .eq("id", funcionarioId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ detail: "Funcionário não encontrado" }, { status: 404 });
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
