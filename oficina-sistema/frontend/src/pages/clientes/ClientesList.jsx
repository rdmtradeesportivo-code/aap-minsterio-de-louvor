import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../../components/NavBar";
import { apiNext as api } from "../../services/api";

const CAMPOS_VAZIOS = { nome: "", telefone: "", email: "", cpf_cnpj: "", endereco: "" };

export default function ClientesList() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(CAMPOS_VAZIOS);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar(termo = "") {
    setCarregando(true);
    setErro("");
    try {
      const res = await api.get("/api/clientes", { params: termo ? { busca: termo } : {} });
      setClientes(res.data);
    } catch (err) {
      // Sem isso, uma falha aqui (rede, sessão expirada, etc.) deixava a
      // lista silenciosamente vazia — indistinguível de "não há clientes".
      setErro(err.response?.data?.detail || "Não foi possível carregar os clientes.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function handleBuscaSubmit(e) {
    e.preventDefault();
    carregar(busca);
  }

  async function handleCriar(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post("/api/clientes", form);
      setForm(CAMPOS_VAZIOS);
      setMostrarForm(false);
      carregar(busca);
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível salvar o cliente.");
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <NavBar />

      <div style={{ padding: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ marginTop: 0 }}>Clientes</h1>
          <button onClick={() => setMostrarForm((v) => !v)} style={styles.primaryButton}>
            {mostrarForm ? "Cancelar" : "+ Novo cliente"}
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={handleCriar} style={styles.formCard}>
            <div style={styles.formGrid}>
              <label style={styles.label}>
                Nome *
                <input
                  required
                  style={styles.input}
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Telefone
                <input
                  style={styles.input}
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                E-mail
                <input
                  type="email"
                  style={styles.input}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                CPF/CNPJ
                <input
                  style={styles.input}
                  value={form.cpf_cnpj}
                  onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                />
              </label>
              <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
                Endereço
                <input
                  style={styles.input}
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                />
              </label>
            </div>
            {erro && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}
            <button type="submit" style={styles.primaryButton}>
              Salvar cliente
            </button>
          </form>
        )}

        <form onSubmit={handleBuscaSubmit} style={{ margin: "20px 0" }}>
          <input
            placeholder="Buscar por nome, telefone ou CPF/CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ ...styles.input, width: "320px" }}
          />
        </form>

        {!mostrarForm && erro && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}

        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>Telefone</th>
                <th style={styles.th}>CPF/CNPJ</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td style={styles.td}>{c.nome}</td>
                  <td style={styles.td}>{c.telefone || "-"}</td>
                  <td style={styles.td}>{c.cpf_cnpj || "-"}</td>
                  <td style={styles.td}>
                    <Link to={`/clientes/${c.id}`}>ver veículos</Link>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr>
                  <td style={styles.td} colSpan={4}>
                    Nenhum cliente encontrado.
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
  table: { width: "100%", borderCollapse: "collapse", maxWidth: "800px" },
  th: { textAlign: "left", borderBottom: "2px solid #e2e8f0", padding: "8px", fontSize: "13px" },
  td: { borderBottom: "1px solid #f1f5f9", padding: "8px", fontSize: "14px" },
};
