import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../../components/NavBar";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import { colors, ui } from "../../theme";
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
    <div style={ui.page}>
      <NavBar />

      <div style={ui.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={ui.h1}>Ordens de Serviço</h1>
          {podeCriar && (
            <button onClick={() => setMostrarForm((v) => !v)} style={ui.primaryButton}>
              {mostrarForm ? "Cancelar" : "+ Nova OS"}
            </button>
          )}
        </div>

        {mostrarForm && (
          <form onSubmit={handleCriar} style={ui.formCard}>
            <div style={ui.formGrid}>
              <label style={ui.label}>
                Cliente *
                <select
                  required
                  style={ui.input}
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
              <label style={ui.label}>
                Veículo *
                <select
                  required
                  disabled={!form.cliente_id}
                  style={ui.input}
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
              <label style={ui.label}>
                Prazo estimado
                <input
                  type="date"
                  style={ui.input}
                  value={form.prazo_estimado}
                  onChange={(e) => setForm({ ...form, prazo_estimado: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                Forma de pagamento
                <input
                  placeholder="à vista, cartão, parcelado..."
                  style={ui.input}
                  value={form.forma_pagamento}
                  onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}
                />
              </label>
            </div>
            {erro && <p style={{ color: colors.danger, fontSize: "13px" }}>{erro}</p>}
            <button type="submit" style={ui.primaryButton}>
              Criar OS
            </button>
          </form>
        )}

        <div style={{ margin: "20px 0" }}>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            style={{ ...ui.input, width: "220px" }}
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
          <table style={{ ...ui.table, maxWidth: "900px" }} className="data-table">
            <thead>
              <tr>
                <th style={ui.th}>OS</th>
                <th style={ui.th}>Cliente</th>
                <th style={ui.th}>Veículo</th>
                <th style={ui.th}>Status</th>
                <th style={ui.th}>Valor total</th>
                <th style={ui.th}></th>
              </tr>
            </thead>
            <tbody>
              {ordens.map((os) => (
                <tr key={os.id}>
                  <td style={ui.td}>#{os.numero}</td>
                  <td style={ui.td}>{os.cliente.nome}</td>
                  <td style={ui.td}>{os.veiculo.placa}</td>
                  <td style={ui.td}>
                    <StatusBadge status={os.status} />
                  </td>
                  <td style={ui.td}>R$ {os.valor_total}</td>
                  <td style={ui.td}>
                    <Link to={`/os/${os.id}`} style={{ color: colors.accent }}>
                      ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
              {ordens.length === 0 && (
                <tr>
                  <td style={ui.td} colSpan={6}>
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
