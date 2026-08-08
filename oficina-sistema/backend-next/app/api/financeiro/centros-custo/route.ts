import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const { data, error } = await ctx.supabase.from("centros_custo").select("*").order("nome");
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
