import { useAuth } from "../contexts/AuthContext";

const NOMES_PERFIL = {
  admin: "Administrador",
  financeiro: "Financeiro",
  recepcao: "Recepção",
  mecanico: "Mecânico/Funileiro",
};

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "32px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ margin: 0 }}>Oficina — Painel</h1>
        <button onClick={logout} style={{ cursor: "pointer" }}>
          Sair
        </button>
      </header>

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
        Módulo 1 (Usuários e Autenticação) concluído. Os próximos módulos
        (Clientes/Veículos, Estoque, Ordens de Serviço e Financeiro) serão
        adicionados aqui incrementalmente.
      </p>
    </div>
  );
}
