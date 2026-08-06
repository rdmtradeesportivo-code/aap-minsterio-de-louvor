import axios from "axios";
import { supabase } from "./supabaseClient";

// Injeta o access_token da sessão Supabase atual em toda requisição — em
// vez de ler um valor estático do localStorage (como era com o JWT
// customizado antigo), pega a sessão vigente a cada chamada. O client do
// Supabase já cuida de renovar o token sozinho (refresh token), então isto
// nunca manda um token expirado de propósito.
async function comTokenAtual(config) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

// Backend novo (Next.js + Supabase Auth/RLS) — por enquanto só o módulo de
// autenticação (Etapa 2 da migração). Os demais endpoints migram pra cá
// módulo a módulo.
export const apiNext = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:3001",
});
apiNext.interceptors.request.use(comTokenAtual);
// Um 401 vindo do backend novo reflete a sessão Supabase de verdade (ele
// valida o token contra o Supabase Auth a cada chamada) — então força
// logout local pra não deixar a UI num estado de "logado" com sessão morta.
// Diferente do 401 do backend antigo (abaixo), que só significa "esse
// módulo ainda não foi migrado" e não diz nada sobre a sessão.
apiNext.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      supabase.auth.signOut();
    }
    return Promise.reject(error);
  }
);

// Backend antigo (FastAPI) — ainda usado pelos módulos que não foram
// migrados pra Next.js/Supabase. Mantido por compatibilidade durante a
// transição; deixa de existir quando o último módulo for migrado.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});
api.interceptors.request.use(comTokenAtual);

export default api;
