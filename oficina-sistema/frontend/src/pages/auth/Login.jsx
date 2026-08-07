import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { colors, fonts } from "../../theme";
import WrenchIcon from "../../components/WrenchIcon";

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
      <div style={styles.brandRow}>
        <WrenchIcon size={30} color={colors.accent} />
        <span style={styles.brandText}>TORQUE</span>
      </div>

      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Entrar</h1>
        <p style={styles.subtitle}>Torque — Gestão para Oficina/Funilaria</p>

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
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "28px",
    background: colors.graphite,
    fontFamily: fonts.body,
  },
  brandRow: { display: "flex", alignItems: "center", gap: "10px" },
  brandText: {
    fontFamily: fonts.heading,
    fontWeight: 700,
    fontSize: "28px",
    letterSpacing: "3px",
    color: "#fff",
  },
  card: {
    background: colors.graphiteAlt,
    border: `1px solid ${colors.graphiteBorder}`,
    padding: "32px",
    borderRadius: "12px",
    width: "340px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontFamily: fonts.heading,
    fontWeight: 600,
    color: "#fff",
  },
  subtitle: { marginTop: 6, marginBottom: 24, color: colors.textOnDarkMuted, fontSize: "13px" },
  label: {
    display: "block",
    marginBottom: "14px",
    fontSize: "13px",
    color: colors.textOnDarkMuted,
    fontWeight: 500,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    marginTop: "6px",
    borderRadius: "6px",
    border: `1px solid ${colors.graphiteBorder}`,
    background: colors.graphiteInput,
    color: "#fff",
    fontSize: "14px",
    boxSizing: "border-box",
    fontFamily: fonts.body,
  },
  erro: { color: "#FCA5A5", fontSize: "13px", marginBottom: "12px" },
  button: {
    width: "100%",
    padding: "11px",
    borderRadius: "6px",
    border: "none",
    background: colors.accent,
    color: "#fff",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "4px",
    fontFamily: fonts.body,
  },
};
