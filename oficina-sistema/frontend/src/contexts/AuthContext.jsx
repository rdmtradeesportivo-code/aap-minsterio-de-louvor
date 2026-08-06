import { createContext, useContext, useEffect, useState } from "react";
import { apiNext } from "../services/api";
import { supabase } from "../services/supabaseClient";

const AuthContext = createContext(null);

// Busca o perfil autoritativo no backend novo — nunca confia só no
// user_metadata do JWT do Supabase pra decisão de acesso (o metadata é
// conveniente pra exibição, mas quem manda de verdade é a tabela
// `usuarios`, a mesma que as RLS policies consultam).
async function buscarUsuario() {
  const res = await apiNext.get("/api/auth/me");
  return res.data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    // Ao montar, o client do Supabase já tenta restaurar a sessão salva
    // (localStorage) sozinho — só precisamos perguntar se existe uma.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        if (ativo) setLoading(false);
        return;
      }
      try {
        const usuario = await buscarUsuario();
        if (ativo) setUser(usuario);
      } catch {
        if (ativo) setUser(null);
      } finally {
        if (ativo) setLoading(false);
      }
    });

    // Reage a login/logout/refresh de token disparados em qualquer lugar
    // (ex.: outra aba, expiração de sessão).
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => {
      ativo = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function login(email, senha) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) {
      throw new Error(error.message);
    }
    const usuario = await buscarUsuario();
    setUser(usuario);
    return usuario;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
