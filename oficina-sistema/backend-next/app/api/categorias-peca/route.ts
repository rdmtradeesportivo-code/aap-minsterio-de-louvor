import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../lib/auth";

const PERFIS_GERENCIAR = ["admin", "financeiro"];

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);

    const { data, error } = await ctx.supabase.from("categorias_peca").select("*").order("nome");
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const payload = await request.json();

    const { data, error } = await ctx.supabase
      .from("categorias_peca")
      .insert({ nome: payload.nome })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
