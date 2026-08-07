import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import NavBar from "../../components/NavBar";
import { apiNext as api } from "../../services/api";
import { colors, ui } from "../../theme";

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
    try {
      const res = await api.get(`/api/clientes/${id}`);
      setCliente(res.data);
    } catch (err) {
      // Sem isso, uma falha aqui deixava a tela travada em "Carregando..."
      // pra sempre, sem nenhuma pista do que deu errado.
      setErro(err.response?.data?.detail || "Não foi possível carregar o cliente.");
    }
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
      <div style={ui.page}>
        <NavBar />
        <p style={{ padding: 32, color: erro ? colors.danger : undefined }}>
          {erro || "Carregando..."}
        </p>
      </div>
    );
  }

  return (
    <div style={ui.page}>
      <NavBar />

      <div style={ui.content}>
        <Link to="/clientes" style={{ fontSize: "13px", color: colors.textSecondary }}>
          ← voltar para clientes
        </Link>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ ...ui.h1, marginTop: "8px", marginBottom: 0 }}>{cliente.nome}</h1>
            <p style={{ color: colors.textSecondary }}>
              {cliente.telefone || "-"} · {cliente.email || "-"} · {cliente.cpf_cnpj || "-"}
            </p>
            {cliente.endereco && <p style={{ color: colors.textSecondary }}>{cliente.endereco}</p>}
          </div>
          {!editandoCliente && (
            <button onClick={iniciarEdicaoCliente} style={ui.secondaryButton}>
              Editar cliente
            </button>
          )}
        </div>

        {editandoCliente && (
          <form onSubmit={handleSalvarCliente} style={ui.formCard}>
            <div style={ui.formGrid}>
              <label style={ui.label}>
                Nome *
                <input
                  required
                  style={ui.input}
                  value={formCliente.nome}
                  onChange={(e) => setFormCliente({ ...formCliente, nome: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                Telefone
                <input
                  style={ui.input}
                  value={formCliente.telefone}
                  onChange={(e) => setFormCliente({ ...formCliente, telefone: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                E-mail
                <input
                  type="email"
                  style={ui.input}
                  value={formCliente.email}
                  onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                CPF/CNPJ
                <input
                  style={ui.input}
                  value={formCliente.cpf_cnpj}
                  onChange={(e) => setFormCliente({ ...formCliente, cpf_cnpj: e.target.value })}
                />
              </label>
              <label style={{ ...ui.label, gridColumn: "1 / -1" }}>
                Endereço
                <input
                  style={ui.input}
                  value={formCliente.endereco}
                  onChange={(e) => setFormCliente({ ...formCliente, endereco: e.target.value })}
                />
              </label>
            </div>
            {erro && <p style={{ color: colors.danger, fontSize: "13px" }}>{erro}</p>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="submit" style={ui.primaryButton}>
                Salvar alterações
              </button>
              <button type="button" onClick={() => setEditandoCliente(false)} style={ui.secondaryButton}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
          <h2 style={{ ...ui.h2, marginTop: 0 }}>Veículos</h2>
          <button onClick={() => setMostrarFormNovo((v) => !v)} style={ui.primaryButton}>
            {mostrarFormNovo ? "Cancelar" : "+ Novo veículo"}
          </button>
        </div>

        {mostrarFormNovo && (
          <form onSubmit={handleCriarVeiculo} style={ui.formCard}>
            <div style={ui.formGrid3}>
              <label style={ui.label}>
                Placa *
                <input
                  required
                  style={ui.input}
                  value={formNovoVeiculo.placa}
                  onChange={(e) =>
                    setFormNovoVeiculo({ ...formNovoVeiculo, placa: e.target.value.toUpperCase() })
                  }
                />
              </label>
              <label style={ui.label}>
                Modelo
                <input
                  style={ui.input}
                  value={formNovoVeiculo.modelo}
                  onChange={(e) => setFormNovoVeiculo({ ...formNovoVeiculo, modelo: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                Marca
                <input
                  style={ui.input}
                  value={formNovoVeiculo.marca}
                  onChange={(e) => setFormNovoVeiculo({ ...formNovoVeiculo, marca: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                Ano
                <input
                  type="number"
                  style={ui.input}
                  value={formNovoVeiculo.ano}
                  onChange={(e) => setFormNovoVeiculo({ ...formNovoVeiculo, ano: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                Cor
                <input
                  style={ui.input}
                  value={formNovoVeiculo.cor}
                  onChange={(e) => setFormNovoVeiculo({ ...formNovoVeiculo, cor: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                KM atual
                <input
                  type="number"
                  style={ui.input}
                  value={formNovoVeiculo.km_atual}
                  onChange={(e) => setFormNovoVeiculo({ ...formNovoVeiculo, km_atual: e.target.value })}
                />
              </label>
            </div>
            {erro && <p style={{ color: colors.danger, fontSize: "13px" }}>{erro}</p>}
            <button type="submit" style={ui.primaryButton}>
              Salvar veículo
            </button>
          </form>
        )}

        <table style={{ ...ui.table, maxWidth: "900px", marginTop: "16px" }} className="data-table">
          <thead>
            <tr>
              <th style={ui.th}>Placa</th>
              <th style={ui.th}>Modelo</th>
              <th style={ui.th}>Marca</th>
              <th style={ui.th}>Ano</th>
              <th style={ui.th}>Cor</th>
              <th style={ui.th}>KM</th>
              <th style={ui.th}></th>
            </tr>
          </thead>
          <tbody>
            {cliente.veiculos.map((v) =>
              editandoVeiculoId === v.id ? (
                <tr key={v.id}>
                  <td style={ui.td} colSpan={7}>
                    <form
                      onSubmit={(e) => handleSalvarVeiculo(e, v.id)}
                      style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}
                    >
                      <input
                        required
                        style={{ ...ui.input, width: "100px" }}
                        value={formVeiculoEdit.placa}
                        onChange={(e) =>
                          setFormVeiculoEdit({ ...formVeiculoEdit, placa: e.target.value.toUpperCase() })
                        }
                      />
                      <input
                        placeholder="Modelo"
                        style={{ ...ui.input, width: "120px" }}
                        value={formVeiculoEdit.modelo}
                        onChange={(e) => setFormVeiculoEdit({ ...formVeiculoEdit, modelo: e.target.value })}
                      />
                      <input
                        placeholder="Marca"
                        style={{ ...ui.input, width: "120px" }}
                        value={formVeiculoEdit.marca}
                        onChange={(e) => setFormVeiculoEdit({ ...formVeiculoEdit, marca: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Ano"
                        style={{ ...ui.input, width: "80px" }}
                        value={formVeiculoEdit.ano}
                        onChange={(e) => setFormVeiculoEdit({ ...formVeiculoEdit, ano: e.target.value })}
                      />
                      <input
                        placeholder="Cor"
                        style={{ ...ui.input, width: "90px" }}
                        value={formVeiculoEdit.cor}
                        onChange={(e) => setFormVeiculoEdit({ ...formVeiculoEdit, cor: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="KM"
                        style={{ ...ui.input, width: "100px" }}
                        value={formVeiculoEdit.km_atual}
                        onChange={(e) => setFormVeiculoEdit({ ...formVeiculoEdit, km_atual: e.target.value })}
                      />
                      <button type="submit" style={ui.primaryButton}>
                        Salvar
                      </button>
                      <button type="button" onClick={() => setEditandoVeiculoId(null)} style={ui.secondaryButton}>
                        Cancelar
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={v.id}>
                  <td style={ui.td}>{v.placa}</td>
                  <td style={ui.td}>{v.modelo || "-"}</td>
                  <td style={ui.td}>{v.marca || "-"}</td>
                  <td style={ui.td}>{v.ano || "-"}</td>
                  <td style={ui.td}>{v.cor || "-"}</td>
                  <td style={ui.td}>{v.km_atual ?? "-"}</td>
                  <td style={ui.td}>
                    <button onClick={() => iniciarEdicaoVeiculo(v)} style={ui.linkButton}>
                      editar
                    </button>
                  </td>
                </tr>
              )
            )}
            {cliente.veiculos.length === 0 && (
              <tr>
                <td style={ui.td} colSpan={7}>
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
