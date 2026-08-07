import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../lib/auth";
import { vazioParaNull } from "../../../lib/normalize";

const PERFIS_PERMITIDOS = ["admin", "financeiro", "recepcao"];
const CAMPOS_OPCIONAIS = ["modelo", "marca", "cor"] as const;

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const placa = request.nextUrl.searchParams.get("placa");
    let query = ctx.supabase.from("veiculos").select("*").order("placa");
    if (placa) {
      query = query.ilike("placa", `%${placa}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const payload = vazioParaNull(await request.json(), CAMPOS_OPCIONAIS);

    if (!payload.cliente_id) {
      return Response.json({ detail: "Cliente não encontrado" }, { status: 404 });
    }
    const { data: cliente, error: clienteError } = await ctx.supabase
      .from("clientes")
      .select("id")
      .eq("id", payload.cliente_id)
      .maybeSingle();
    if (clienteError) throw clienteError;
    if (!cliente) return Response.json({ detail: "Cliente não encontrado" }, { status: 404 });

    const { data, error } = await ctx.supabase
      .from("veiculos")
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json({ detail: "Placa já cadastrada" }, { status: 409 });
      }
      throw error;
    }
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
