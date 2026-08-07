import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../lib/auth";
import { vazioParaNull, escaparValorFiltroOr } from "../../../lib/normalize";

// Recepção cadastra/edita clientes; Admin e Financeiro veem tudo. Mecânico
// não tem acesso (mesma regra do FastAPI antigo, reforçada aqui e pela RLS
// policy `clientes_all`, que já restringe exatamente aos mesmos 3 perfis).
const PERFIS_PERMITIDOS = ["admin", "financeiro", "recepcao"];

const CAMPOS_OPCIONAIS = ["telefone", "email", "cpf_cnpj", "endereco"] as const;

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const busca = request.nextUrl.searchParams.get("busca");
    let query = ctx.supabase.from("clientes").select("*").order("nome");

    if (busca) {
      const termo = escaparValorFiltroOr(`%${busca}%`);
      query = query.or(`nome.ilike.${termo},cpf_cnpj.ilike.${termo},telefone.ilike.${termo}`);
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

    const { data, error } = await ctx.supabase
      .from("clientes")
      .insert(payload)
      .select()
      .single();

    if (error) {
      // 23505 = unique_violation — mesmo código que o antigo tratava via
      // IntegrityError do SQLAlchemy, aqui devolvido pelo Postgres direto.
      if (error.code === "23505") {
        return Response.json({ detail: "CPF/CNPJ já cadastrado" }, { status: 409 });
      }
      throw error;
    }
    return Response.json(data, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
