import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../lib/auth";
import { vazioParaNull } from "../../../lib/normalize";

// Consulta liberada pra qualquer autenticado (RLS já garante isso);
// cadastro/edição restrito a admin/financeiro — mesma regra do
// FastAPI antigo (app/routers/estoque.py).
const PERFIS_GERENCIAR = ["admin", "financeiro"];
const CAMPOS_OPCIONAIS = ["telefone", "email", "cnpj", "endereco"] as const;

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);

    const { data, error } = await ctx.supabase.from("fornecedores").select("*").order("nome");
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

    const payload = vazioParaNull(await request.json(), CAMPOS_OPCIONAIS);

    const { data, error } = await ctx.supabase
      .from("fornecedores")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
