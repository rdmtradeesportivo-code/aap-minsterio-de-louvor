import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import NavBar from "../../components/NavBar";
import api from "../../services/api";

const VEICULO_VAZIO = { placa: "", modelo: "", marca: "", ano: "", cor: "", km_atual: "" };

export default function ClienteDetail() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [form, setForm] = useState(VEICULO_VAZIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    const res = await api.get(`/api/clientes/${id}`);
    setCliente(res.data);
  }

  useEffect(() => {
    carregar();
  }, [id]);

  async function handleCriarVeiculo(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post("/api/veiculos", {
        ...form,
        cliente_id: Number(id),
        ano: form.ano ? Number(form.ano) : null,
        km_atual: form.km_atual ? Number(form.km_atual) : null,
      });
      setForm(VEICULO_VAZIO);
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível salvar o veículo.");
    }
  }

  if (!cliente) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif" }}>
        <NavBar />
        <p style={{ padding: 32 }}>Carregando...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <NavBar />

      <div style={{ padding: "32px" }}>
        <Link to="/clientes" style={{ fontSize: "13px", color: "#64748b" }}>
          ← voltar para clientes
        </Link>

        <h1 style={{ marginTop: "8px" }}>{cliente.nome}</h1>
        <p style={{ color: "#334155" }}>
          {cliente.telefone || "-"} · {cliente.email || "-"} · {cliente.cpf_cnpj || "-"}
        </p>
        {cliente.endereco && <p style={{ color: "#64748b" }}>{cliente.endereco}</p>}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>Veículos</h2>
          <button onClick={() => setMostrarForm((v) => !v)} style={styles.primaryButton}>
            {mostrarForm ? "Cancelar" : "+ Novo veículo"}
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={handleCriarVeiculo} style={styles.formCard}>
            <div style={styles.formGrid}>
              <label style={styles.label}>
                Placa *
                <input
                  required
                  style={styles.input}
                  value={form.placa}
                  onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                />
              </label>
              <label style={styles.label}>
                Modelo
                <input
                  style={styles.input}
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Marca
                <input
                  style={styles.input}
                  value={form.marca}
                  onChange={(e) => setForm({ ...form, marca: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Ano
                <input
                  type="number"
                  style={styles.input}
                  value={form.ano}
                  onChange={(e) => setForm({ ...form, ano: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Cor
                <input
                  style={styles.input}
                  value={form.cor}
                  onChange={(e) => setForm({ ...form, cor: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                KM atual
                <input
                  type="number"
                  style={styles.input}
                  value={form.km_atual}
                  onChange={(e) => setForm({ ...form, km_atual: e.target.value })}
                />
              </label>
            </div>
            {erro && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}
            <button type="submit" style={styles.primaryButton}>
              Salvar veículo
            </button>
          </form>
        )}

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Placa</th>
              <th style={styles.th}>Modelo</th>
              <th style={styles.th}>Marca</th>
              <th style={styles.th}>Ano</th>
              <th style={styles.th}>Cor</th>
              <th style={styles.th}>KM</th>
            </tr>
          </thead>
          <tbody>
            {cliente.veiculos.map((v) => (
              <tr key={v.id}>
                <td style={styles.td}>{v.placa}</td>
                <td style={styles.td}>{v.modelo || "-"}</td>
                <td style={styles.td}>{v.marca || "-"}</td>
                <td style={styles.td}>{v.ano || "-"}</td>
                <td style={styles.td}>{v.cor || "-"}</td>
                <td style={styles.td}>{v.km_atual ?? "-"}</td>
              </tr>
            ))}
            {cliente.veiculos.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={6}>
                  Nenhum veículo cadastrado para este cliente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
    gridTemplateColumns: "1fr 1fr 1fr",
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
  table: { width: "100%", borderCollapse: "collapse", maxWidth: "800px", marginTop: "16px" },
  th: { textAlign: "left", borderBottom: "2px solid #e2e8f0", padding: "8px", fontSize: "13px" },
  td: { borderBottom: "1px solid #f1f5f9", padding: "8px", fontSize: "14px" },
};
