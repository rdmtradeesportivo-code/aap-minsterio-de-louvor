import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRequestClient } from "./supabase";

export interface AuthContext {
  /** Cliente Supabase já escopado ao token do usuário — reutilizável pela
   * rota pra qualquer query subsequente, sem precisar recriar. */
  supabase: SupabaseClient;
  accessToken: string;
  /** auth.users.id (uuid) do Supabase Auth. */
  authUserId: string;
  email: string | null;
  /** usuarios.id (bigint) — o mesmo id usado em todos os FKs legados
   * (funcionarios.usuario_id, ordens_servico.criado_por, etc.). */
  usuarioId: number;
  perfil: string;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function extractBearerToken(request: NextRequest): string {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new AuthError("Token de acesso ausente ou inválido.", 401);
  }
  return token;
}

/**
 * Valida o Bearer token contra o Supabase Auth de verdade — nunca decodifica
 * o JWT localmente sem verificação, pra não confiar num token forjado ou
 * expirado. Depois resolve o perfil via `usuarios` (mesma tabela e mesma
 * policy `usuarios_select` da Etapa 1: "própria linha ou admin vê todas" —
 * então, na prática, esta query aqui só nunca falha por RLS porque cada
 * usuário sempre pode ler a própria linha).
 *
 * Espelha app/core/deps.py::get_current_user do FastAPI antigo.
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const accessToken = extractBearerToken(request);
  const supabase = createRequestClient(accessToken);

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    throw new AuthError("Sessão inválida ou expirada.", 401);
  }

  const { data: usuarioRow, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id, perfil, ativo")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (usuarioError) {
    throw new AuthError("Não foi possível resolver o perfil do usuário.", 500);
  }
  if (!usuarioRow) {
    // Conta existe no Supabase Auth mas não tem linha vinculada em
    // `usuarios` (ex.: criada fora do fluxo oficial) — sem perfil, sem
    // acesso a nada no sistema.
    throw new AuthError("Usuário autenticado, mas sem perfil cadastrado no sistema.", 403);
  }
  if (!usuarioRow.ativo) {
    throw new AuthError("Usuário desativado.", 403);
  }

  return {
    supabase,
    accessToken,
    authUserId: userData.user.id,
    email: userData.user.email ?? null,
    usuarioId: usuarioRow.id as number,
    perfil: usuarioRow.perfil as string,
  };
}

/**
 * Bloqueia a rota pra quem não estiver num dos perfis permitidos — espelha
 * require_role(...) do FastAPI antigo. Isso é redundante de propósito com
 * as RLS policies (defesa em profundidade): mesmo que uma policy tenha uma
 * brecha, a rota já barra antes de qualquer query de negócio rodar.
 */
export function requirePerfil(ctx: AuthContext, perfis: string[]): void {
  if (!perfis.includes(ctx.perfil)) {
    throw new AuthError(`Acesso restrito a: ${perfis.join(", ")}.`, 403);
  }
}

/** Converte um AuthError em Response JSON — padroniza o formato de erro
 * (`{ detail: "..." }`) igual ao FastAPI antigo, pra minimizar mudança no
 * frontend que já sabe ler `err.response?.data?.detail`. */
export function authErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    return Response.json({ detail: err.message }, { status: err.status });
  }
  console.error("Erro inesperado:", err);
  return Response.json({ detail: "Erro interno do servidor." }, { status: 500 });
}
