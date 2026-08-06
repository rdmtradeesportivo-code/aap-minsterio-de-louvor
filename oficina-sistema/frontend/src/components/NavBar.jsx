import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const PODE_VER_CLIENTES = ["admin", "financeiro", "recepcao"];
const PODE_VER_FINANCEIRO = ["admin", "financeiro"];

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
        <Link to="/estoque" style={styles.link}>
          Estoque
        </Link>
        <Link to="/os" style={styles.link}>
          Ordens de Serviço
        </Link>
        {PODE_VER_FINANCEIRO.includes(user?.perfil) && (
          <>
            <Link to="/financeiro/contas-pagar" style={styles.link}>
              Contas a Pagar
            </Link>
            <Link to="/financeiro/contas-receber" style={styles.link}>
              Contas a Receber
            </Link>
            <Link to="/financeiro/folha" style={styles.link}>
              Folha
            </Link>
            <Link to="/financeiro/orcado-realizado" style={styles.link}>
              Orçado x Realizado
            </Link>
            <Link to="/financeiro/dashboard" style={styles.link}>
              Dashboard
            </Link>
          </>
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
