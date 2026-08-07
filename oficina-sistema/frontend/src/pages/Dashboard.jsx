import NavBar from "../components/NavBar";
import { useAuth } from "../contexts/AuthContext";
import { colors, ui } from "../theme";

const NOMES_PERFIL = {
  admin: "Administrador",
  financeiro: "Financeiro",
  recepcao: "Recepção",
  mecanico: "Mecânico/Funileiro",
};

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div style={ui.page}>
      <NavBar />

      <div style={ui.content}>
        <h1 style={ui.h1}>Painel</h1>

        <div style={{ ...ui.card, marginTop: "16px", maxWidth: "480px" }}>
          <p style={{ margin: "4px 0" }}>
            <strong>Nome:</strong> {user.nome}
          </p>
          <p style={{ margin: "4px 0" }}>
            <strong>E-mail:</strong> {user.email}
          </p>
          <p style={{ margin: "4px 0" }}>
            <strong>Perfil:</strong> {NOMES_PERFIL[user.perfil] || user.perfil}
          </p>
        </div>

        <p style={{ marginTop: "24px", color: colors.textSecondary }}>
          Módulos concluídos: Usuários e Autenticação, Clientes e Veículos. Os
          próximos módulos (Estoque, Ordens de Serviço e Financeiro) serão
          adicionados aqui incrementalmente.
        </p>
      </div>
    </div>
  );
}
