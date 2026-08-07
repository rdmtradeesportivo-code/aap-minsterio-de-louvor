import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";
import { vazioParaNull } from "../../../../lib/normalize";
import { parseIdOrNull } from "../../../../lib/ids";

const PERFIS_PERMITIDOS = ["admin", "financeiro", "recepcao"];
const CAMPOS_OPCIONAIS = ["telefone", "email", "cpf_cnpj", "endereco"] as const;

type Params = { params: Promise<{ id: string }> };

/** Cliente + veículos aninhados — espelha ClienteComVeiculos do FastAPI. */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const clienteId = parseIdOrNull((await params).id);
    if (clienteId === null) {
      return Response.json({ detail: "Cliente não encontrado" }, { status: 404 });
    }

    const { data, error } = await ctx.supabase
      .from("clientes")
      .select("*, veiculos(*)")
      .eq("id", clienteId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ detail: "Cliente não encontrado" }, { status: 404 });
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const clienteId = parseIdOrNull((await params).id);
    if (clienteId === null) {
      return Response.json({ detail: "Cliente não encontrado" }, { status: 404 });
    }

    const payload = vazioParaNull(await request.json(), CAMPOS_OPCIONAIS);

    const { data, error } = await ctx.supabase
      .from("clientes")
      .update(payload)
      .eq("id", clienteId)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return Response.json({ detail: "CPF/CNPJ já cadastrado" }, { status: 409 });
      }
      throw error;
    }
    if (!data) return Response.json({ detail: "Cliente não encontrado" }, { status: 404 });
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const clienteId = parseIdOrNull((await params).id);
    if (clienteId === null) {
      return Response.json({ detail: "Cliente não encontrado" }, { status: 404 });
    }

    const { data, error } = await ctx.supabase
      .from("clientes")
      .delete()
      .eq("id", clienteId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ detail: "Cliente não encontrado" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
