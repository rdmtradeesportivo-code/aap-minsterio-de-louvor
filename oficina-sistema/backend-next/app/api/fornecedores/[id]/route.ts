import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";
import { vazioParaNull } from "../../../../lib/normalize";
import { parseIdOrNull } from "../../../../lib/ids";

const PERFIS_GERENCIAR = ["admin", "financeiro"];
const CAMPOS_OPCIONAIS = ["telefone", "email", "cnpj", "endereco"] as const;

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const fornecedorId = parseIdOrNull((await params).id);
    if (fornecedorId === null) {
      return Response.json({ detail: "Fornecedor não encontrado" }, { status: 404 });
    }

    const payload = vazioParaNull(await request.json(), CAMPOS_OPCIONAIS);

    const { data, error } = await ctx.supabase
      .from("fornecedores")
      .update(payload)
      .eq("id", fornecedorId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ detail: "Fornecedor não encontrado" }, { status: 404 });
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
