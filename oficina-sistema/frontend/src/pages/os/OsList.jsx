import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../../components/NavBar";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import { NOMES_STATUS } from "./statusUtils";

const PODE_CRIAR = ["admin", "financeiro", "recepcao"];

export default function OsList() {
  const { user } = useAuth();
  const podeCriar = PODE_CRIAR.includes(user?.perfil);

  const [ordens, setOrdens] = useState([]);
  const [statusFiltro, setStatusFiltro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [veiculosDoCliente, setVeiculosDoCliente] = useState([]);
  const [form, setForm] = useState({ cliente_id: "", veiculo_id: "", prazo_estimado: "", forma_pagamento: "" });
  const [erro, setErro] = useState("");

  async function carregar() {
    setCarregando(true);
    try {
      const params = statusFiltro ? { status_filtro: statusFiltro } : {};
      const res = await api.get("/api/ordens-servico", { params });
      setOrdens(res.data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFiltro]);

  useEffect(() => {
    if (podeCriar) {
      api.get("/api/clientes").then((res) => setClientes(res.data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClienteChange(clienteId) {
    setForm({ ...form, cliente_id: clienteId, veiculo_id: "" });
    if (!clienteId) {
      setVeiculosDoCliente([]);
      return;
    }
    const res = await api.get(`/api/clientes/${clienteId}`);
    setVeiculosDoCliente(res.data.veiculos);
  }

  async function handleCriar(e) {
    e.preventDefault();
    setErro("");
    try {
      const res = await api.post("/api/ordens-servico", {
        cliente_id: Number(form.cliente_id),
        veiculo_id: Number(form.veiculo_id),
        prazo_estimado: form.prazo_estimado || null,
        forma_pagamento: form.forma_pagamento || null,
      });
      setForm({ cliente_id: "", veiculo_id: "", prazo_estimado: "", forma_pagamento: "" });
      setVeiculosDoCliente([]);
      setMostrarForm(false);
      carregar();
      window.location.href = `/os/${res.data.id}`;
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível criar a OS.");
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <NavBar />

      <div style={{ padding: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ marginTop: 0 }}>Ordens de Serviço</h1>
          {podeCriar && (
            <button onClick={() => setMostrarForm((v) => !v)} style={styles.primaryButton}>
              {mostrarForm ? "Cancelar" : "+ Nova OS"}
            </button>
          )}
        </div>

        {mostrarForm && (
          <form onSubmit={handleCriar} style={styles.formCard}>
            <div style={styles.formGrid}>
              <label style={styles.label}>
                Cliente *
                <select
                  required
                  style={styles.input}
                  value={form.cliente_id}
                  onChange={(e) => handleClienteChange(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                Veículo *
                <select
                  required
                  disabled={!form.cliente_id}
                  style={styles.input}
                  value={form.veiculo_id}
                  onChange={(e) => setForm({ ...form, veiculo_id: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {veiculosDoCliente.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} — {v.modelo}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                Prazo estimado
                <input
                  type="date"
                  style={styles.input}
                  value={form.prazo_estimado}
                  onChange={(e) => setForm({ ...form, prazo_estimado: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Forma de pagamento
                <input
                  placeholder="à vista, cartão, parcelado..."
                  style={styles.input}
                  value={form.forma_pagamento}
                  onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}
                />
              </label>
            </div>
            {erro && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}
            <button type="submit" style={styles.primaryButton}>
              Criar OS
            </button>
          </form>
        )}

        <div style={{ margin: "20px 0" }}>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            style={{ ...styles.input, width: "220px" }}
          >
            <option value="">Todos os status</option>
            {Object.entries(NOMES_STATUS).map(([valor, nome]) => (
              <option key={valor} value={valor}>
                {nome}
              </option>
            ))}
          </select>
        </div>

        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>OS</th>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Veículo</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Valor total</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {ordens.map((os) => (
                <tr key={os.id}>
                  <td style={styles.td}>#{os.numero}</td>
                  <td style={styles.td}>{os.cliente.nome}</td>
                  <td style={styles.td}>{os.veiculo.placa}</td>
                  <td style={styles.td}>
                    <StatusBadge status={os.status} />
                  </td>
                  <td style={styles.td}>R$ {os.valor_total}</td>
                  <td style={styles.td}>
                    <Link to={`/os/${os.id}`}>ver detalhes</Link>
                  </td>
                </tr>
              ))}
              {ordens.length === 0 && (
                <tr>
                  <td style={styles.td} colSpan={6}>
                    Nenhuma ordem de serviço encontrada.
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

const styles = {
  primaryButton: {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "none",
    background: "#0f172a",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
  },
  formCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "20px",
    marginTop: "16px",
    maxWidth: "600px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  },
  label: { fontSize: "13px", color: "#334155" },
  input: {
    display: "block",
    width: "100%",
    padding: "8px 10px",
    marginTop: "4px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  table: { width: "100%", borderCollapse: "collapse", maxWidth: "900px" },
  th: { textAlign: "left", borderBottom: "2px solid #e2e8f0", padding: "8px", fontSize: "13px" },
  td: { borderBottom: "1px solid #f1f5f9", padding: "8px", fontSize: "14px" },
};
