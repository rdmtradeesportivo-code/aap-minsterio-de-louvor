import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// cache() deduplica chamadas repetidas dentro da mesma requisição (layout +
// page acabam chamando esta função), evitando múltiplas idas ao Supabase
// Auth que podiam entrar em conflito com a renovação de sessão do proxy.
export const getCurrentProfile = cache(async (): Promise<{
  userId: string;
  email: string | null;
  profile: Profile;
}> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O proxy (src/proxy.ts) já garante que só usuários autenticados chegam
  // até aqui. Se mesmo assim não houver usuário, é uma falha transitória —
  // lançamos um erro (capturado por error.tsx) em vez de redirecionar de
  // novo, para não competir com o proxy e criar um loop de redirecionamento.
  if (!user) {
    throw new Error("Sessão não encontrada. Saia e entre novamente.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new Error("Perfil não encontrado para este usuário.");
  }

  return { userId: user.id, email: user.email ?? null, profile };
});

export function canManage(role: Profile["role"]) {
  return role === "admin" || role === "lider";
}
