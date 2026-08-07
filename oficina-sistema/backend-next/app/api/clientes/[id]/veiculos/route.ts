import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { parseIdOrNull } from "../../../../../lib/ids";

const PERFIS_PERMITIDOS = ["admin", "financeiro", "recepcao"];

type Params = { params: Promise<{ id: string }> };

/** Lista os veículos de um cliente separadamente (usado em telas que só
 * precisam da lista, sem o resto dos dados do cliente). */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_PERMITIDOS);

    const clienteId = parseIdOrNull((await params).id);
    if (clienteId === null) {
      return Response.json({ detail: "Cliente não encontrado" }, { status: 404 });
    }

    // Confirma que o cliente existe antes de listar — sem isso, um
    // cliente_id inexistente devolveria silenciosamente uma lista vazia
    // em vez do 404 que o FastAPI antigo dava.
    const { data: cliente, error: clienteError } = await ctx.supabase
      .from("clientes")
      .select("id")
      .eq("id", clienteId)
      .maybeSingle();
    if (clienteError) throw clienteError;
    if (!cliente) return Response.json({ detail: "Cliente não encontrado" }, { status: 404 });

    const { data, error } = await ctx.supabase
      .from("veiculos")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("placa");
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return authErrorResponse(err);
  }
}
