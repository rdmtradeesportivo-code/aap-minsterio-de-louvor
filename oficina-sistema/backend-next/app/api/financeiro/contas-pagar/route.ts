import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";
import { respostaErroRpc } from "../../../../lib/rpcError";

const PERFIS_PERMITIDOS = ["admin", "financeiro"];

/** Lista contas a pagar — sempre atualiza status vencido>pendente para
 * 'atrasado' antes de listar, pra não depender de um job agendado (mesmo
 * comportamento de app/services/financeiro.py::atualizar_status_vencidos,
 * chamado no início do router antigo). */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const { error: erroUpdate } = await ctx.supabase.rpc("atualizar_status_financeiro_vencidos");
    if (erroUpdate) return respostaErroRpc(erroUpdate);

    const statusFiltro = request.nextUrl.searchParams.get("status_filtro");
    const categoriaId = request.nextUrl.searchParams.get("categoria_id");

    let query = ctx.supabase.from("contas_pagar").select("*").order("vencimento");
    if (statusFiltro) query = query.eq("status", statusFiltro);
    if (categoriaId) query = query.eq("categoria_id", Number(categoriaId));

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}

/** Lançamento manual — compra de peça (Etapa 4, registrar_movimentacao_estoque)
 * e folha (fechar_folha, acima) geram contas_pagar automaticamente com
 * origem própria; aqui é sempre origem='manual' (valor default da coluna). */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const body = await request.json();
    const { data, error } = await ctx.supabase
      .from("contas_pagar")
      .insert({
        fornecedor_id: body.fornecedor_id ?? null,
        descricao: body.descricao,
        categoria_id: body.categoria_id,
        centro_custo_id: body.centro_custo_id ?? null,
        valor: body.valor,
        vencimento: body.vencimento,
      })
      .select()
      .single();

    if (error) {
      // 23503 = foreign_key_violation — categoria_id inexistente.
      if (error.code === "23503") {
        return Response.json({ detail: "Categoria de despesa não encontrada" }, { status: 404 });
      }
      throw error;
    }
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
