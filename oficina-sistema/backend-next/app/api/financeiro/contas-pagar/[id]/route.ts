import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { parseIdOrNull } from "../../../../../lib/ids";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];
const STATUS_EDITAVEIS = ["pendente", "atrasado"];

type Params = { params: Promise<{ id: string }> };

/** Só permite editar uma conta ainda não paga — mesma regra de
 * app/services/financeiro.py::atualizar_conta_pagar. */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const contaId = parseIdOrNull((await params).id);
    if (contaId === null) {
      return Response.json({ detail: "Conta a pagar não encontrada" }, { status: 404 });
    }

    const { data: contaAtual, error: erroSelect } = await ctx.supabase
      .from("contas_pagar")
      .select("status")
      .eq("id", contaId)
      .maybeSingle();
    if (erroSelect) throw erroSelect;
    if (!contaAtual) return Response.json({ detail: "Conta a pagar não encontrada" }, { status: 404 });
    if (!STATUS_EDITAVEIS.includes(contaAtual.status)) {
      return Response.json({ detail: "Só é possível editar uma conta pendente" }, { status: 400 });
    }

    const body = await request.json();
    const payload: Record<string, unknown> = {};
    for (const campo of ["fornecedor_id", "descricao", "categoria_id", "centro_custo_id", "valor", "vencimento"]) {
      if (body[campo] !== undefined) payload[campo] = body[campo];
    }

    const { data, error } = await ctx.supabase
      .from("contas_pagar")
      .update(payload)
      .eq("id", contaId)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === "23503") {
        return Response.json({ detail: "Categoria de despesa não encontrada" }, { status: 404 });
      }
      throw error;
    }
    if (!data) return Response.json({ detail: "Conta a pagar não encontrada" }, { status: 404 });
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
