import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../lib/auth";
import { vazioParaNull, escaparValorFiltroOr } from "../../../lib/normalize";
import { comEstoqueBaixo } from "../../../lib/pecas";

// Consulta liberada pra qualquer autenticado (mecânico precisa conferir
// disponibilidade antes de iniciar um serviço); cadastro/edição restrito a
// admin/financeiro. Mesma regra do FastAPI antigo (Módulo 3).
const PERFIS_GERENCIAR = ["admin", "financeiro"];
const CAMPOS_OPCIONAIS = ["unidade_medida"] as const;

// estoque_atual nunca é definido direto por create/update — só muda através
// de uma movimentação (ver /api/estoque/movimentacoes/*, que chama a RPC
// registrar_movimentacao_estoque). Peça nova sempre começa com estoque 0
// (default da coluna no banco).

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);

    const busca = request.nextUrl.searchParams.get("busca");
    const somenteEstoqueBaixo = request.nextUrl.searchParams.get("somente_estoque_baixo") === "true";

    let query = ctx.supabase.from("pecas").select("*").order("descricao");
    if (busca) {
      const termo = escaparValorFiltroOr(`%${busca}%`);
      query = query.or(`codigo.ilike.${termo},descricao.ilike.${termo}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let pecas = (data ?? []).map(comEstoqueBaixo);
    if (somenteEstoqueBaixo) {
      pecas = pecas.filter((p) => p.estoque_baixo);
    }
    return Response.json(pecas);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const payload = vazioParaNull(await request.json(), CAMPOS_OPCIONAIS);
    for (const campo of ["custo_compra", "preco_venda", "estoque_minimo"] as const) {
      if (payload[campo] !== undefined && payload[campo] !== null && Number(payload[campo]) < 0) {
        return Response.json({ detail: `${campo} não pode ser negativo` }, { status: 400 });
      }
    }

    const { data, error } = await ctx.supabase
      .from("pecas")
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json({ detail: "Código já cadastrado" }, { status: 409 });
      }
      throw error;
    }
    return Response.json(comEstoqueBaixo(data), { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
