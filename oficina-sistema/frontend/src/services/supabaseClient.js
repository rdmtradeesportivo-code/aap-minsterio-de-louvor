import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Falha alto e cedo — sem essas duas variáveis o login não tem como
  // funcionar, e um erro silencioso aqui seria bem mais difícil de
  // diagnosticar do que travar já na inicialização.
  throw new Error(
    "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias (ver .env.example)."
  );
}

// Único cliente Supabase da aplicação — login, sessão (refresh automático,
// persistência em localStorage) e qualquer chamada direta à API REST do
// Supabase passam por aqui.
export const supabase = createClient(url, anonKey);
