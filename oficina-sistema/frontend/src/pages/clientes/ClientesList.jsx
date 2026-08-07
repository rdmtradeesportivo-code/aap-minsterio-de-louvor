import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../../components/NavBar";
import { apiNext as api } from "../../services/api";
import { colors, ui } from "../../theme";

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
    <div style={ui.page}>
      <NavBar />

      <div style={ui.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={ui.h1}>Clientes</h1>
          <button onClick={() => setMostrarForm((v) => !v)} style={ui.primaryButton}>
            {mostrarForm ? "Cancelar" : "+ Novo cliente"}
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={handleCriar} style={ui.formCard}>
            <div style={ui.formGrid}>
              <label style={ui.label}>
                Nome *
                <input
                  required
                  style={ui.input}
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                Telefone
                <input
                  style={ui.input}
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                E-mail
                <input
                  type="email"
                  style={ui.input}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                CPF/CNPJ
                <input
                  style={ui.input}
                  value={form.cpf_cnpj}
                  onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                />
              </label>
              <label style={{ ...ui.label, gridColumn: "1 / -1" }}>
                Endereço
                <input
                  style={ui.input}
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                />
              </label>
            </div>
            {erro && <p style={{ color: colors.danger, fontSize: "13px" }}>{erro}</p>}
            <button type="submit" style={ui.primaryButton}>
              Salvar cliente
            </button>
          </form>
        )}

        <form onSubmit={handleBuscaSubmit} style={{ margin: "20px 0" }}>
          <input
            placeholder="Buscar por nome, telefone ou CPF/CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ ...ui.input, width: "320px" }}
          />
        </form>

        {!mostrarForm && erro && <p style={{ color: colors.danger, fontSize: "13px" }}>{erro}</p>}

        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <table style={{ ...ui.table, maxWidth: "800px" }} className="data-table">
            <thead>
              <tr>
                <th style={ui.th}>Nome</th>
                <th style={ui.th}>Telefone</th>
                <th style={ui.th}>CPF/CNPJ</th>
                <th style={ui.th}></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td style={ui.td}>{c.nome}</td>
                  <td style={ui.td}>{c.telefone || "-"}</td>
                  <td style={ui.td}>{c.cpf_cnpj || "-"}</td>
                  <td style={ui.td}>
                    <Link to={`/clientes/${c.id}`} style={{ color: colors.accent }}>
                      ver veículos
                    </Link>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr>
                  <td style={ui.td} colSpan={4}>
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
