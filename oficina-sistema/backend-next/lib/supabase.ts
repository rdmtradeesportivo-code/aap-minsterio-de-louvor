import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase "escopado" ao token de acesso de quem fez a chamada —
 * nunca um cliente global/compartilhado. Ao mandar o Bearer token do
 * usuário no header Authorization, `auth.uid()` dentro do Postgres resolve
 * exatamente como resolveria se o próprio browser chamasse a REST API do
 * Supabase direto. É isso que faz as RLS policies da Etapa 1 valerem de
 * verdade nas chamadas feitas por essas API routes — nunca usamos a
 * service_role key aqui, então nenhuma rota bypassa RLS por acidente.
 *
 * A checagem das env vars é feita aqui dentro (não no topo do módulo) de
 * propósito: o passo "Collecting page data" do build do Next.js importa
 * cada route module pra extrair metadata, sem necessariamente ter as env
 * vars de runtime disponíveis nesse momento — um `throw` no topo do módulo
 * derruba o build inteiro por um motivo que só existe em build-time, não
 * em produção de verdade.
 */
export function createRequestClient(accessToken: string): SupabaseClient {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias (ver .env.example)."
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
