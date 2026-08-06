import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import NavBar from "../../components/NavBar";
import api from "../../services/api";

const VEICULO_VAZIO = { placa: "", modelo: "", marca: "", ano: "", cor: "", km_atual: "" };

function veiculoParaForm(v) {
  return {
    placa: v.placa || "",
    modelo: v.modelo || "",
    marca: v.marca || "",
    ano: v.ano ?? "",
    cor: v.cor || "",
    km_atual: v.km_atual ?? "",
  };
}

export default function ClienteDetail() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);

  // criação de veículo
  const [formNovoVeiculo, setFormNovoVeiculo] = useState(VEICULO_VAZIO);
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false);

  // edição do cliente
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [formCliente, setFormCliente] = useState(null);

  // edição de veículo (linha da tabela)
  const [editandoVeiculoId, setEditandoVeiculoId] = useState(null);
  const [formVeiculoEdit, setFormVeiculoEdit] = useState(VEICULO_VAZIO);

  const [erro, setErro] = useState("");

  async function carregar() {
    const res = await api.get(`/api/clientes/${id}`);
    setCliente(res.data);
  }

  useEffect(() => {
    carregar();
  }, [id]);

  function iniciarEdicaoCliente() {
    setFormCliente({
      nome: cliente.nome || "",
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      cpf_cnpj: cliente.cpf_cnpj || "",
      endereco: cliente.endereco || "",
    });
    setEditandoCliente(true);
  }

  async function handleSalvarCliente(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.put(`/api/clientes/${id}`, formCliente);
      setEditandoCliente(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível salvar as alterações do cliente.");
    }
  }

  async function handleCriarVeiculo(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post("/api/veiculos", {
        ...formNovoVeiculo,
        cliente_id: Number(id),
        ano: formNovoVeiculo.ano ? Number(formNovoVeiculo.ano) : null,
        km_atual: formNovoVeiculo.km_atual ? Number(formNovoVeiculo.km_atual) : null,
      });
      setFormNovoVeiculo(VEICULO_VAZIO);
      setMostrarFormNovo(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível salvar o veículo.");
    }
  }

  function iniciarEdicaoVeiculo(v) {
    setFormVeiculoEdit(veiculoParaForm(v));
    setEditandoVeiculoId(v.id);
  }

  async function handleSalvarVeiculo(e, veiculoId) {
    e.preventDefault();
    setErro("");
    try {
      await api.put(`/api/veiculos/${veiculoId}`, {
        ...formVeiculoEdit,
        ano: formVeiculoEdit.ano ? Number(formVeiculoEdit.ano) : null,
        km_atual: formVeiculoEdit.km_atual ? Number(formVeiculoEdit.km_atual) : null,
      });
      setEditandoVeiculoId(null);
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ marginTop: "8px", marginBottom: 0 }}>{cliente.nome}</h1>
            <p style={{ color: "#334155" }}>
              {cliente.telefone || "-"} · {cliente.email || "-"} · {cliente.cpf_cnpj || "-"}
            </p>
            {cliente.endereco && <p style={{ color: "#64748b" }}>{cliente.endereco}</p>}
          </div>
          {!editandoCliente && (
            <button onClick={iniciarEdicaoCliente} style={styles.secondaryButton}>
              Editar cliente
            </button>
          )}
        </div>

        {editandoCliente && (
          <form onSubmit={handleSalvarCliente} style={styles.formCard}>
            <div style={styles.formGrid}>
              <label style={styles.label}>
                Nome *
                <input
                  required
                  style={styles.input}
                  value={formCliente.nome}
                  onChange={(e) => setFormCliente({ ...formCliente, nome: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Telefone
                <input
                  style={styles.input}
                  value={formCliente.telefone}
                  onChange={(e) => setFormCliente({ ...formCliente, telefone: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                E-mail
                <input
                  type="email"
                  style={styles.input}
                  value={formCliente.email}
                  onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                CPF/CNPJ
                <input
                  style={styles.input}
                  value={formCliente.cpf_cnpj}
                  onChange={(e) => setFormCliente({ ...formCliente, cpf_cnpj: e.target.value })}
                />
              </label>
              <label style={{ ...styles.label, gridColumn: "1 / -1" }}>
                Endereço
                <input
                  style={styles.input}
                  value={formCliente.endereco}
                  onChange={(e) => setFormCliente({ ...formCliente, endereco: e.target.value })}
                />
              </label>
            </div>
            {erro && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="submit" style={styles.primaryButton}>
                Salvar alterações
              </button>
              <button type="button" onClick={() => setEditandoCliente(false)} style={styles.secondaryButton}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>Veículos</h2>
          <button onClick={() => setMostrarFormNovo((v) => !v)} style={styles.primaryButton}>
            {mostrarFormNovo ? "Cancelar" : "+ Novo veículo"}
          </button>
        </div>

        {mostrarFormNovo && (
          <form onSubmit={handleCriarVeiculo} style={styles.formCard}>
            <div style={styles.formGrid3}>
              <label style={styles.label}>
                Placa *
                <input
                  required
                  style={styles.input}
                  value={formNovoVeiculo.placa}
                  onChange={(e) =>
                    setFormNovoVeiculo({ ...formNovoVeiculo, placa: e.target.value.toUpperCase() })
                  }
                />
              </label>
              <label style={styles.label}>
                Modelo
                <input
                  style={styles.input}
                  value={formNovoVeiculo.modelo}
                  onChange={(e) => setFormNovoVeiculo({ ...formNovoVeiculo, modelo: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Marca
                <input
                  style={styles.input}
                  value={formNovoVeiculo.marca}
                  onChange={(e) => setFormNovoVeiculo({ ...formNovoVeiculo, marca: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Ano
                <input
                  type="number"
                  style={styles.input}
                  value={formNovoVeiculo.ano}
                  onChange={(e) => setFormNovoVeiculo({ ...formNovoVeiculo, ano: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Cor
                <input
                  style={styles.input}
                  value={formNovoVeiculo.cor}
                  onChange={(e) => setFormNovoVeiculo({ ...formNovoVeiculo, cor: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                KM atual
                <input
                  type="number"
                  style={styles.input}
                  value={formNovoVeiculo.km_atual}
                  onChange={(e) => setFormNovoVeiculo({ ...formNovoVeiculo, km_atual: e.target.value })}
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
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {cliente.veiculos.map((v) =>
              editandoVeiculoId === v.id ? (
                <tr key={v.id}>
                  <td style={styles.td} colSpan={7}>
                    <form
                      onSubmit={(e) => handleSalvarVeiculo(e, v.id)}
                      style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}
                    >
                      <input
                        required
                        style={{ ...styles.input, width: "100px" }}
                        value={formVeiculoEdit.placa}
                        onChange={(e) =>
                          setFormVeiculoEdit({ ...formVeiculoEdit, placa: e.target.value.toUpperCase() })
                        }
                      />
                      <input
                        placeholder="Modelo"
                        style={{ ...styles.input, width: "120px" }}
                        value={formVeiculoEdit.modelo}
                        onChange={(e) => setFormVeiculoEdit({ ...formVeiculoEdit, modelo: e.target.value })}
                      />
                      <input
                        placeholder="Marca"
                        style={{ ...styles.input, width: "120px" }}
                        value={formVeiculoEdit.marca}
                        onChange={(e) => setFormVeiculoEdit({ ...formVeiculoEdit, marca: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Ano"
                        style={{ ...styles.input, width: "80px" }}
                        value={formVeiculoEdit.ano}
                        onChange={(e) => setFormVeiculoEdit({ ...formVeiculoEdit, ano: e.target.value })}
                      />
                      <input
                        placeholder="Cor"
                        style={{ ...styles.input, width: "90px" }}
                        value={formVeiculoEdit.cor}
                        onChange={(e) => setFormVeiculoEdit({ ...formVeiculoEdit, cor: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="KM"
                        style={{ ...styles.input, width: "100px" }}
                        value={formVeiculoEdit.km_atual}
                        onChange={(e) => setFormVeiculoEdit({ ...formVeiculoEdit, km_atual: e.target.value })}
                      />
                      <button type="submit" style={styles.primaryButton}>
                        Salvar
                      </button>
                      <button type="button" onClick={() => setEditandoVeiculoId(null)} style={styles.secondaryButton}>
                        Cancelar
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={v.id}>
                  <td style={styles.td}>{v.placa}</td>
                  <td style={styles.td}>{v.modelo || "-"}</td>
                  <td style={styles.td}>{v.marca || "-"}</td>
                  <td style={styles.td}>{v.ano || "-"}</td>
                  <td style={styles.td}>{v.cor || "-"}</td>
                  <td style={styles.td}>{v.km_atual ?? "-"}</td>
                  <td style={styles.td}>
                    <button onClick={() => iniciarEdicaoVeiculo(v)} style={styles.linkButton}>
                      editar
                    </button>
                  </td>
                </tr>
              )
            )}
            {cliente.veiculos.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={7}>
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
  secondaryButton: {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontSize: "14px",
  },
  linkButton: {
    border: "none",
    background: "none",
    color: "#2563eb",
    cursor: "pointer",
    fontSize: "13px",
    textDecoration: "underline",
    padding: 0,
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
  formGrid3: {
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
  table: { width: "100%", borderCollapse: "collapse", maxWidth: "900px", marginTop: "16px" },
  th: { textAlign: "left", borderBottom: "2px solid #e2e8f0", padding: "8px", fontSize: "13px" },
  td: { borderBottom: "1px solid #f1f5f9", padding: "8px", fontSize: "14px" },
};
