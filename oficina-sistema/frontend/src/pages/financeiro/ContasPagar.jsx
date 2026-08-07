import { useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import api from "../../services/api";
import { styles } from "./financeiroStyles";

const STATUS_LABEL = { pendente: "Pendente", pago: "Pago", atrasado: "Atrasado" };
const STATUS_COR = {
  pendente: { bg: "#f1f5f9", fg: "#475569" },
  pago: { bg: "#dcfce7", fg: "#166534" },
  atrasado: { bg: "#fee2e2", fg: "#991b1b" },
};

const FORM_VAZIO = { descricao: "", categoria_id: "", centro_custo_id: "", valor: "", vencimento: "" };

export default function ContasPagar() {
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [statusFiltro, setStatusFiltro] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    try {
      const params = statusFiltro ? { status_filtro: statusFiltro } : {};
      const res = await api.get("/api/financeiro/contas-pagar", { params });
      setContas(res.data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    api.get("/api/financeiro/categorias-despesa").then((res) => setCategorias(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFiltro]);

  function nomeCategoria(id) {
    return categorias.find((c) => c.id === id)?.nome || "-";
  }

  async function handleCriar(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post("/api/financeiro/contas-pagar", {
        descricao: form.descricao,
        categoria_id: Number(form.categoria_id),
        centro_custo_id: form.centro_custo_id ? Number(form.centro_custo_id) : null,
        valor: Number(form.valor),
        vencimento: form.vencimento,
      });
      setForm(FORM_VAZIO);
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível salvar a conta.");
    }
  }

  async function handlePagar(id) {
    setErro("");
    try {
      await api.post(`/api/financeiro/contas-pagar/${id}/pagar`);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível marcar como paga.");
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <NavBar />
      <div style={{ padding: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ marginTop: 0 }}>Contas a Pagar</h1>
          <button onClick={() => setMostrarForm((v) => !v)} style={styles.primaryButton}>
            {mostrarForm ? "Cancelar" : "+ Novo lançamento"}
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={handleCriar} style={styles.formCard}>
            <div style={styles.formGrid}>
              <label style={styles.label}>
                Descrição *
                <input
                  required
                  style={styles.input}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Categoria * <span style={{ color: "#dc2626" }}>(obrigatória)</span>
                <select
                  required
                  style={styles.input}
                  value={form.categoria_id}
                  onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.tipo})
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                Valor *
                <input
                  required
                  type="number"
                  step="0.01"
                  style={styles.input}
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Vencimento *
                <input
                  required
                  type="date"
                  style={styles.input}
                  value={form.vencimento}
                  onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                />
              </label>
            </div>
            {erro && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}
            <button type="submit" style={styles.primaryButton}>
              Salvar
            </button>
          </form>
        )}

        <div style={{ margin: "20px 0" }}>
          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} style={{ ...styles.input, width: "200px" }}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="atrasado">Atrasado</option>
            <option value="pago">Pago</option>
          </select>
        </div>

        {erro && !mostrarForm && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}

        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <table style={styles.table} className="data-table">
            <thead>
              <tr>
                <th style={styles.th}>Descrição</th>
                <th style={styles.th}>Categoria</th>
                <th style={styles.th}>Valor</th>
                <th style={styles.th}>Vencimento</th>
                <th style={styles.th}>Origem</th>
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
                    <td style={styles.td}>{nomeCategoria(c.categoria_id)}</td>
                    <td style={styles.td}>R$ {c.valor}</td>
                    <td style={styles.td}>{c.vencimento}</td>
                    <td style={styles.td}>{c.origem}</td>
                    <td style={styles.td}>
                      <span style={{ background: cor.bg, color: cor.fg, padding: "2px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: 600 }}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {c.status !== "pago" && (
                        <button onClick={() => handlePagar(c.id)} style={styles.linkButton}>
                          marcar como paga
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {contas.length === 0 && (
                <tr>
                  <td style={styles.td} colSpan={7}>
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
