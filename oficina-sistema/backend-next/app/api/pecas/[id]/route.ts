import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";
import { vazioParaNull } from "../../../../lib/normalize";
import { parseIdOrNull } from "../../../../lib/ids";
import { comEstoqueBaixo } from "../../../../lib/pecas";

const PERFIS_GERENCIAR = ["admin", "financeiro"];
const CAMPOS_OPCIONAIS = ["unidade_medida"] as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);

    const pecaId = parseIdOrNull((await params).id);
    if (pecaId === null) {
      return Response.json({ detail: "Peça não encontrada" }, { status: 404 });
    }

    const { data, error } = await ctx.supabase.from("pecas").select("*").eq("id", pecaId).maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ detail: "Peça não encontrada" }, { status: 404 });
    return Response.json(comEstoqueBaixo(data));
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const pecaId = parseIdOrNull((await params).id);
    if (pecaId === null) {
      return Response.json({ detail: "Peça não encontrada" }, { status: 404 });
    }

    const payload = vazioParaNull(await request.json(), CAMPOS_OPCIONAIS);
    for (const campo of ["custo_compra", "preco_venda", "estoque_minimo"] as const) {
      if (payload[campo] !== undefined && payload[campo] !== null && Number(payload[campo]) < 0) {
        return Response.json({ detail: `${campo} não pode ser negativo` }, { status: 400 });
      }
    }

    const { data, error } = await ctx.supabase
      .from("pecas")
      .update(payload)
      .eq("id", pecaId)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return Response.json({ detail: "Código já cadastrado" }, { status: 409 });
      }
      throw error;
    }
    if (!data) return Response.json({ detail: "Peça não encontrada" }, { status: 404 });
    return Response.json(comEstoqueBaixo(data));
  } catch (err) {
    return authErrorResponse(err);
  }
}
