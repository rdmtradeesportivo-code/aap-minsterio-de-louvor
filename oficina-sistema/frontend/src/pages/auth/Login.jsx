import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await login(email, senha);
      navigate("/dashboard");
    } catch (err) {
      // err.message vem do Supabase Auth (ex.: "Invalid login credentials")
      // quando o login falha; err.response?.data?.detail cobre o caso de a
      // falha ser na chamada seguinte ao backend (/api/auth/me).
      setErro(err.response?.data?.detail || err.message || "Falha ao entrar. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Oficina — Login</h1>
        <p style={styles.subtitle}>Sistema de Gestão para Oficina/Funilaria</p>

        <label style={styles.label}>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
            autoComplete="username"
          />
        </label>

        <label style={styles.label}>
          Senha
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            style={styles.input}
            autoComplete="current-password"
          />
        </label>

        {erro && <p style={styles.erro}>{erro}</p>}

        <button type="submit" disabled={carregando} style={styles.button}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    background: "#fff",
    padding: "32px",
    borderRadius: "12px",
    width: "320px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },
  title: { margin: 0, fontSize: "22px" },
  subtitle: { marginTop: 4, marginBottom: 24, color: "#64748b", fontSize: "13px" },
  label: { display: "block", marginBottom: "14px", fontSize: "14px", color: "#334155" },
  input: {
    width: "100%",
    padding: "8px 10px",
    marginTop: "4px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  erro: { color: "#dc2626", fontSize: "13px", marginBottom: "12px" },
  button: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "none",
    background: "#0f172a",
    color: "#fff",
    fontSize: "14px",
    cursor: "pointer",
  },
};
