import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("oficina_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("oficina_token");
    if (!token) {
      setLoading(false);
      return;
    }
    // Revalida a sessão consultando /api/auth/me
    api
      .get("/api/auth/me")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("oficina_user", JSON.stringify(res.data));
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, senha) {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", senha);

    const res = await api.post("/api/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    localStorage.setItem("oficina_token", res.data.access_token);
    localStorage.setItem("oficina_user", JSON.stringify(res.data.usuario));
    setUser(res.data.usuario);
    return res.data.usuario;
  }

  function logout() {
    localStorage.removeItem("oficina_token");
    localStorage.removeItem("oficina_user");
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
