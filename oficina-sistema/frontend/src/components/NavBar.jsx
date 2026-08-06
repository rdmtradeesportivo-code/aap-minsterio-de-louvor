import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const PODE_VER_CLIENTES = ["admin", "financeiro", "recepcao"];

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <Link to="/dashboard" style={styles.brand}>
          Oficina
        </Link>
        {PODE_VER_CLIENTES.includes(user?.perfil) && (
          <Link to="/clientes" style={styles.link}>
            Clientes
          </Link>
        )}
      </div>
      <button onClick={logout} style={styles.button}>
        Sair
      </button>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 32px",
    borderBottom: "1px solid #e2e8f0",
    fontFamily: "system-ui, sans-serif",
  },
  left: { display: "flex", alignItems: "center", gap: "20px" },
  brand: { fontWeight: 700, fontSize: "18px", color: "#0f172a", textDecoration: "none" },
  link: { color: "#334155", textDecoration: "none", fontSize: "14px" },
  button: { cursor: "pointer" },
};
