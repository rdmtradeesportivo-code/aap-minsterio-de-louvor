import { useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import api from "../../services/api";
import { styles } from "./financeiroStyles";

const STATUS_LABEL = { pendente: "Pendente", recebido: "Recebido", atrasado: "Atrasado" };
const STATUS_COR = {
  pendente: { bg: "#f1f5f9", fg: "#475569" },
  recebido: { bg: "#dcfce7", fg: "#166534" },
  atrasado: { bg: "#fee2e2", fg: "#991b1b" },
};

export default function ContasReceber() {
  const [contas, setContas] = useState([]);
  const [statusFiltro, setStatusFiltro] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    try {
      const params = statusFiltro ? { status_filtro: statusFiltro } : {};
      const res = await api.get("/api/financeiro/contas-receber", { params });
      setContas(res.data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFiltro]);

  async function handleReceber(id) {
    setErro("");
    try {
      await api.post(`/api/financeiro/contas-receber/${id}/receber`);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível marcar como recebida.");
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <NavBar />
      <div style={{ padding: "32px" }}>
        <h1 style={{ marginTop: 0 }}>Contas a Receber</h1>
        <p style={{ color: "#64748b", fontSize: "13px", marginTop: "-8px" }}>
          Geradas automaticamente ao faturar uma Ordem de Serviço.
        </p>

        <div style={{ margin: "20px 0" }}>
          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} style={{ ...styles.input, width: "200px" }}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="atrasado">Atrasado</option>
            <option value="recebido">Recebido</option>
          </select>
        </div>

        {erro && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}

        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <table style={styles.table} className="data-table">
            <thead>
              <tr>
                <th style={styles.th}>Descrição</th>
                <th style={styles.th}>Parcela</th>
                <th style={styles.th}>Valor</th>
                <th style={styles.th}>Vencimento</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {contas.map((c) => {
                const cor = STATUS_COR[c.status];
                return (
                  <tr key={c.id}>
                    <td style={styles.td}>{c.descricao}</td>
                    <td style={styles.td}>{c.numero_parcela}/{c.total_parcelas}</td>
                    <td style={styles.td}>R$ {c.valor}</td>
                    <td style={styles.td}>{c.vencimento}</td>
                    <td style={styles.td}>
                      <span style={{ background: cor.bg, color: cor.fg, padding: "2px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 }}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {c.status !== "recebido" && (
                        <button onClick={() => handleReceber(c.id)} style={styles.linkButton}>
                          marcar como recebida
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {contas.length === 0 && (
                <tr>
                  <td style={styles.td} colSpan={6}>
                    Nenhuma conta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
