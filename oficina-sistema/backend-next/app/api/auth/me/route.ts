import type { NextRequest } from "next/server";
import { getAuthContext, authErrorResponse } from "../../../../lib/auth";

/** Espelha GET /api/auth/me do FastAPI antigo: valida a sessão e devolve
 * quem é o usuário — usado pelo frontend logo após o login pra saber o
 * perfil (e por qualquer tela que precise revalidar a sessão). */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request);
    return Response.json({
      id: ctx.usuarioId,
      auth_user_id: ctx.authUserId,
      email: ctx.email,
      perfil: ctx.perfil,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
