import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts } from "../theme";
import WrenchIcon from "./WrenchIcon";

const PODE_VER_CLIENTES = ["admin", "financeiro", "recepcao"];
const PODE_VER_FINANCEIRO = ["admin", "financeiro"];

export default function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  function ativo(to) {
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  function Item({ to, children }) {
    const destaque = ativo(to);
    return (
      <Link
        to={to}
        style={{
          ...styles.link,
          color: destaque ? colors.accent : colors.textOnDarkMuted,
          borderBottom: destaque ? `2px solid ${colors.accent}` : "2px solid transparent",
        }}
      >
        {children}
      </Link>
    );
  }

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <Link to="/dashboard" style={styles.brand}>
          <WrenchIcon size={18} color={colors.accent} />
          TORQUE
        </Link>
        <Item to="/dashboard">Painel</Item>
        {PODE_VER_CLIENTES.includes(user?.perfil) && <Item to="/clientes">Clientes</Item>}
        <Item to="/estoque">Estoque</Item>
        <Item to="/os">Ordens de Serviço</Item>
        {PODE_VER_FINANCEIRO.includes(user?.perfil) && (
          <>
            <Item to="/financeiro/contas-pagar">Contas a Pagar</Item>
            <Item to="/financeiro/contas-receber">Contas a Receber</Item>
            <Item to="/financeiro/folha">Folha</Item>
            <Item to="/financeiro/orcado-realizado">Orçado x Realizado</Item>
            <Item to="/financeiro/dashboard">Dashboard</Item>
            <Item to="/relatorios">Relatórios</Item>
          </>
        )}
      </div>
      <button onClick={logout} style={styles.logoutButton}>
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
    padding: "0 32px",
    height: "58px",
    background: colors.graphite,
    borderBottom: `1px solid ${colors.graphiteBorder}`,
    fontFamily: fonts.body,
  },
  left: { display: "flex", alignItems: "center", gap: "22px", height: "100%" },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: fonts.heading,
    fontWeight: 700,
    fontSize: "18px",
    letterSpacing: "1.5px",
    color: "#fff",
    textDecoration: "none",
    marginRight: "6px",
  },
  link: {
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: 600,
    height: "100%",
    display: "flex",
    alignItems: "center",
  },
  logoutButton: {
    padding: "7px 14px",
    borderRadius: "6px",
    border: `1px solid ${colors.graphiteBorder}`,
    background: "transparent",
    color: colors.textOnDarkMuted,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    fontFamily: fonts.body,
  },
};
