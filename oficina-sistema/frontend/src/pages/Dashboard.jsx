import NavBar from "../components/NavBar";
import { useAuth } from "../contexts/AuthContext";

const NOMES_PERFIL = {
  admin: "Administrador",
  financeiro: "Financeiro",
  recepcao: "Recepção",
  mecanico: "Mecânico/Funileiro",
};

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <NavBar />

      <div style={{ padding: "32px" }}>
        <h1 style={{ marginTop: 0 }}>Painel</h1>

        <div
          style={{
            background: "#f1f5f9",
            padding: "20px",
            borderRadius: "10px",
            maxWidth: "480px",
          }}
        >
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

        <p style={{ marginTop: "24px", color: "#64748b" }}>
          Módulos concluídos: Usuários e Autenticação, Clientes e Veículos. Os
          próximos módulos (Estoque, Ordens de Serviço e Financeiro) serão
          adicionados aqui incrementalmente.
        </p>
      </div>
    </div>
  );
}
