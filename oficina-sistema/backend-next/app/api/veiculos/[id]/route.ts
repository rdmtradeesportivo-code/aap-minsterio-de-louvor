import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";
import { vazioParaNull } from "../../../../lib/normalize";
import { parseIdOrNull } from "../../../../lib/ids";

const PERFIS_PERMITIDOS = ["admin", "financeiro", "recepcao"];
const CAMPOS_OPCIONAIS = ["modelo", "marca", "cor"] as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const veiculoId = parseIdOrNull((await params).id);
    if (veiculoId === null) {
      return Response.json({ detail: "Veículo não encontrado" }, { status: 404 });
    }

    const { data, error } = await ctx.supabase
      .from("veiculos")
      .select("*")
      .eq("id", veiculoId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ detail: "Veículo não encontrado" }, { status: 404 });
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const veiculoId = parseIdOrNull((await params).id);
    if (veiculoId === null) {
      return Response.json({ detail: "Veículo não encontrado" }, { status: 404 });
    }

    const payload = vazioParaNull(await request.json(), CAMPOS_OPCIONAIS);

    if (payload.cliente_id !== undefined && payload.cliente_id !== null) {
      const { data: cliente, error: clienteError } = await ctx.supabase
        .from("clientes")
        .select("id")
        .eq("id", payload.cliente_id as number)
        .maybeSingle();
      if (clienteError) throw clienteError;
      if (!cliente) return Response.json({ detail: "Cliente não encontrado" }, { status: 404 });
    }

    const { data, error } = await ctx.supabase
      .from("veiculos")
      .update(payload)
      .eq("id", veiculoId)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return Response.json({ detail: "Placa já cadastrada" }, { status: 409 });
      }
      throw error;
    }
    if (!data) return Response.json({ detail: "Veículo não encontrado" }, { status: 404 });
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const veiculoId = parseIdOrNull((await params).id);
    if (veiculoId === null) {
      return Response.json({ detail: "Veículo não encontrado" }, { status: 404 });
    }

    const { data, error } = await ctx.supabase
      .from("veiculos")
      .delete()
      .eq("id", veiculoId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ detail: "Veículo não encontrado" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
