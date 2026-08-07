import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../lib/auth";

// GET liberado a qualquer autenticado (recepção/mecânico precisam do
// dropdown de responsável ao lançar item de serviço numa OS); só
// cadastrar/editar é admin/financeiro — mesma regra do FastAPI antigo.
const PERFIS_GERENCIAR = ["admin", "financeiro"];

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);

    const somenteAtivosParam = request.nextUrl.searchParams.get("somente_ativos");
    const somenteAtivos = somenteAtivosParam === null ? true : somenteAtivosParam === "true";

    let query = ctx.supabase.from("funcionarios").select("*").order("nome");
    if (somenteAtivos) query = query.eq("ativo", true);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const payload = await request.json();
    const { data, error } = await ctx.supabase.from("funcionarios").insert(payload).select().single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
