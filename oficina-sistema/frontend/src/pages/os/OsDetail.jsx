import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import NavBar from "../../components/NavBar";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import { apiNext as api } from "../../services/api";
import { colors, ui } from "../../theme";
import { NOMES_STATUS, STATUS_CANCELAVEIS, TRANSICOES_PERMITIDAS } from "./statusUtils";

const PODE_GERENCIAR = ["admin", "financeiro", "recepcao"];
const PODE_FATURAR = ["admin", "financeiro"];
const ITENS_BLOQUEADOS = ["faturado", "pago", "cancelado"];

export default function OsDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const podeGerenciar = PODE_GERENCIAR.includes(user?.perfil);
  const podeFaturar = PODE_FATURAR.includes(user?.perfil);

  const [os, setOs] = useState(null);
  const [pecas, setPecas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [erro, setErro] = useState("");

  const [formPeca, setFormPeca] = useState({ peca_id: "", quantidade: "" });
  const [formServico, setFormServico] = useState({ descricao: "", valor: "", funcionario_id: "" });
  const [formFuncionario, setFormFuncionario] = useState({ funcionario_id: "", papel: "" });
  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [tipoFoto, setTipoFoto] = useState("antes");
  const [arquivoFoto, setArquivoFoto] = useState(null);

  async function carregar() {
    setErro("");
    try {
      const res = await api.get(`/api/ordens-servico/${id}`);
      setOs(res.data);
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível carregar a ordem de serviço.");
    }
  }

  useEffect(() => {
    carregar();
    api.get("/api/pecas").then((res) => setPecas(res.data));
    api.get("/api/funcionarios").then((res) => setFuncionarios(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function nomePeca(pecaId) {
    return pecas.find((p) => p.id === pecaId)?.descricao || `Peça #${pecaId}`;
  }

  function nomeFuncionario(funcionarioId) {
    return funcionarios.find((f) => f.id === funcionarioId)?.nome || null;
  }

  async function handleMudarStatus(novoStatus) {
    setErro("");
    try {
      await api.post(`/api/ordens-servico/${id}/status`, { novo_status: novoStatus });
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível mudar o status.");
    }
  }

  async function handleCancelar() {
    setErro("");
    const motivo = window.prompt("Motivo do cancelamento (opcional):") || "";
    if (motivo === null) return;
    if (!window.confirm(`Cancelar a OS #${os.numero}? Estoque de peças já baixado será estornado.`)) {
      return;
    }
    try {
      await api.post(`/api/ordens-servico/${id}/cancelar`, { motivo: motivo || null });
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível cancelar a OS.");
    }
  }

  async function handleFaturar(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post(`/api/ordens-servico/${id}/faturar`, { numero_parcelas: Number(numeroParcelas) });
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível faturar a OS.");
    }
  }

  async function handleAdicionarPeca(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post(`/api/ordens-servico/${id}/itens-peca`, {
        peca_id: Number(formPeca.peca_id),
        quantidade: Number(formPeca.quantidade),
      });
      setFormPeca({ peca_id: "", quantidade: "" });
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível adicionar o item.");
    }
  }

  async function handleRemoverPeca(itemId) {
    setErro("");
    try {
      await api.delete(`/api/ordens-servico/${id}/itens-peca/${itemId}`);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível remover o item.");
    }
  }

  async function handleAdicionarServico(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post(`/api/ordens-servico/${id}/itens-servico`, {
        descricao: formServico.descricao,
        valor: Number(formServico.valor),
        funcionario_id: formServico.funcionario_id ? Number(formServico.funcionario_id) : null,
      });
      setFormServico({ descricao: "", valor: "", funcionario_id: "" });
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível adicionar o serviço.");
    }
  }

  async function handleRemoverServico(itemId) {
    setErro("");
    try {
      await api.delete(`/api/ordens-servico/${id}/itens-servico/${itemId}`);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível remover o item.");
    }
  }

  async function handleAdicionarFuncionario(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post(`/api/ordens-servico/${id}/funcionarios`, {
        funcionario_id: Number(formFuncionario.funcionario_id),
        papel: formFuncionario.papel || null,
      });
      setFormFuncionario({ funcionario_id: "", papel: "" });
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível adicionar o responsável.");
    }
  }

  async function handleEnviarFoto(e) {
    e.preventDefault();
    setErro("");
    if (!arquivoFoto) return;
    const dados = new FormData();
    dados.append("tipo", tipoFoto);
    dados.append("arquivo", arquivoFoto);
    try {
      await api.post(`/api/ordens-servico/${id}/fotos`, dados, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setArquivoFoto(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível enviar a foto.");
    }
  }

  async function handleBaixarPdf() {
    const res = await api.get(`/api/ordens-servico/${id}/pdf`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    window.open(url, "_blank");
  }

  if (!os) {
    return (
      <div style={ui.page}>
        <NavBar />
        <p style={{ padding: 32, color: erro ? colors.danger : undefined }}>
          {erro || "Carregando..."}
        </p>
      </div>
    );
  }

  const itensBloqueados = ITENS_BLOQUEADOS.includes(os.status);
  const transicoesDisponiveis = TRANSICOES_PERMITIDAS[os.status] || [];

  return (
    <div style={ui.page}>
      <NavBar />

      <div style={{ ...ui.content, maxWidth: "1000px" }}>
        <Link to="/os" style={{ fontSize: "13px", color: colors.textSecondary }}>
          ← voltar para ordens de serviço
        </Link>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "8px" }}>
          <div>
            <h1 style={{ ...ui.h1, display: "flex", alignItems: "center", gap: "10px" }}>
              OS #{os.numero} <StatusBadge status={os.status} />
            </h1>
            <p style={{ color: colors.textSecondary }}>
              {os.cliente.nome} · {os.veiculo.marca} {os.veiculo.modelo} — {os.veiculo.placa}
            </p>
            {os.prazo_estimado && (
              <p style={{ color: colors.textSecondary, fontSize: "13px" }}>Prazo: {os.prazo_estimado}</p>
            )}
            {os.forma_pagamento && (
              <p style={{ color: colors.textSecondary, fontSize: "13px" }}>Pagamento: {os.forma_pagamento}</p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ ...ui.statValue, margin: 0 }}>R$ {os.valor_total}</p>
            <button onClick={handleBaixarPdf} style={ui.secondaryButton}>
              Baixar PDF do orçamento
            </button>
          </div>
        </div>

        {erro && <p style={{ color: colors.danger, fontSize: "13px" }}>{erro}</p>}

        {podeGerenciar && (transicoesDisponiveis.length > 0 || STATUS_CANCELAVEIS.includes(os.status)) && (
          <div style={{ margin: "16px 0" }}>
            <strong style={{ fontSize: "13px", marginRight: "8px" }}>Mudar status:</strong>
            {transicoesDisponiveis.map((s) => (
              <button key={s} onClick={() => handleMudarStatus(s)} style={{ ...ui.secondaryButton, marginRight: "8px" }}>
                {NOMES_STATUS[s]}
              </button>
            ))}
            {STATUS_CANCELAVEIS.includes(os.status) && (
              <button onClick={handleCancelar} style={ui.dangerButton}>
                Cancelar OS
              </button>
            )}
          </div>
        )}

        {podeFaturar && os.status === "concluido" && (
          <form onSubmit={handleFaturar} style={{ ...ui.formCard, maxWidth: "360px" }}>
            <strong style={{ fontSize: "13px" }}>Faturar OS</strong>
            <label style={{ ...ui.label, display: "block", marginTop: "8px" }}>
              Número de parcelas
              <input
                type="number"
                min="1"
                max="24"
                style={ui.input}
                value={numeroParcelas}
                onChange={(e) => setNumeroParcelas(e.target.value)}
              />
            </label>
            <button type="submit" style={{ ...ui.primaryButton, marginTop: "10px" }}>
              Faturar (gera contas a receber)
            </button>
          </form>
        )}

        {/* Itens de peça */}
        <h2 style={ui.h2}>Peças</h2>
        <table style={ui.table} className="data-table">
          <thead>
            <tr>
              <th style={ui.th}>Peça</th>
              <th style={ui.th}>Qtd.</th>
              <th style={ui.th}>Preço unit.</th>
              <th style={ui.th}>Subtotal</th>
              {podeGerenciar && !itensBloqueados && <th style={ui.th}></th>}
            </tr>
          </thead>
          <tbody>
            {os.itens_peca.map((item) => (
              <tr key={item.id}>
                <td style={ui.td}>{nomePeca(item.peca_id)}</td>
                <td style={ui.td}>{item.quantidade}</td>
                <td style={ui.td}>R$ {item.preco_unitario_venda}</td>
                <td style={ui.td}>R$ {(item.quantidade * item.preco_unitario_venda).toFixed(2)}</td>
                {podeGerenciar && !itensBloqueados && (
                  <td style={ui.td}>
                    <button onClick={() => handleRemoverPeca(item.id)} style={ui.linkButton}>
                      remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {os.itens_peca.length === 0 && (
              <tr>
                <td style={ui.td} colSpan={5}>
                  Nenhuma peça adicionada.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {podeGerenciar && !itensBloqueados && (
          <form onSubmit={handleAdicionarPeca} style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <select
              required
              style={{ ...ui.input, width: "260px" }}
              value={formPeca.peca_id}
              onChange={(e) => setFormPeca({ ...formPeca, peca_id: e.target.value })}
            >
              <option value="">Selecione a peça...</option>
              {pecas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.descricao} (estoque: {p.estoque_atual})
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              step="0.01"
              placeholder="Quantidade"
              style={{ ...ui.input, width: "120px" }}
              value={formPeca.quantidade}
              onChange={(e) => setFormPeca({ ...formPeca, quantidade: e.target.value })}
            />
            <button type="submit" style={ui.primaryButton}>
              Adicionar
            </button>
          </form>
        )}

        {/* Itens de serviço */}
        <h2 style={ui.h2}>Serviços (mão de obra)</h2>
        <table style={ui.table} className="data-table">
          <thead>
            <tr>
              <th style={ui.th}>Descrição</th>
              <th style={ui.th}>Valor</th>
              <th style={ui.th}>Responsável</th>
              {podeGerenciar && !itensBloqueados && <th style={ui.th}></th>}
            </tr>
          </thead>
          <tbody>
            {os.itens_servico.map((item) => (
              <tr key={item.id}>
                <td style={ui.td}>{item.descricao}</td>
                <td style={ui.td}>R$ {item.valor}</td>
                <td style={ui.td}>{item.funcionario_id ? nomeFuncionario(item.funcionario_id) || "-" : "-"}</td>
                {podeGerenciar && !itensBloqueados && (
                  <td style={ui.td}>
                    <button onClick={() => handleRemoverServico(item.id)} style={ui.linkButton}>
                      remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {os.itens_servico.length === 0 && (
              <tr>
                <td style={ui.td} colSpan={4}>
                  Nenhum serviço adicionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {podeGerenciar && !itensBloqueados && (
          <form onSubmit={handleAdicionarServico} style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
            <input
              required
              placeholder="Descrição do serviço"
              style={{ ...ui.input, width: "220px" }}
              value={formServico.descricao}
              onChange={(e) => setFormServico({ ...formServico, descricao: e.target.value })}
            />
            <input
              required
              type="number"
              step="0.01"
              placeholder="Valor"
              style={{ ...ui.input, width: "100px" }}
              value={formServico.valor}
              onChange={(e) => setFormServico({ ...formServico, valor: e.target.value })}
            />
            <select
              style={{ ...ui.input, width: "180px" }}
              value={formServico.funcionario_id}
              onChange={(e) => setFormServico({ ...formServico, funcionario_id: e.target.value })}
            >
              <option value="">Sem responsável</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
            <button type="submit" style={ui.primaryButton}>
              Adicionar
            </button>
          </form>
        )}

        {/* Funcionários responsáveis */}
        <h2 style={ui.h2}>Funcionários responsáveis</h2>
        <ul>
          {os.funcionarios.map((f) => (
            <li key={f.id}>
              {nomeFuncionario(f.funcionario_id) || `Funcionário #${f.funcionario_id}`}
              {f.papel ? ` — ${f.papel}` : ""}
            </li>
          ))}
          {os.funcionarios.length === 0 && (
            <li style={{ listStyle: "none", color: colors.textSecondary }}>Nenhum responsável adicionado.</li>
          )}
        </ul>

        {podeGerenciar && (
          <form onSubmit={handleAdicionarFuncionario} style={{ display: "flex", gap: "8px" }}>
            <select
              required
              style={{ ...ui.input, width: "220px" }}
              value={formFuncionario.funcionario_id}
              onChange={(e) => setFormFuncionario({ ...formFuncionario, funcionario_id: e.target.value })}
            >
              <option value="">Selecione o funcionário...</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
            <input
              placeholder="Papel (funileiro, pintor...)"
              style={{ ...ui.input, width: "180px" }}
              value={formFuncionario.papel}
              onChange={(e) => setFormFuncionario({ ...formFuncionario, papel: e.target.value })}
            />
            <button type="submit" style={ui.primaryButton}>
              Adicionar
            </button>
          </form>
        )}

        {/* Fotos */}
        <h2 style={ui.h2}>Fotos</h2>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
          {os.fotos.map((foto) => (
            <a key={foto.id} href={foto.url} target="_blank" rel="noreferrer">
              <img
                src={foto.url}
                alt={foto.tipo}
                style={{ width: "120px", height: "90px", objectFit: "cover", borderRadius: "6px", border: `1px solid ${colors.border}` }}
              />
              <p style={{ fontSize: "11px", textAlign: "center", margin: "2px 0" }}>{foto.tipo}</p>
            </a>
          ))}
          {os.fotos.length === 0 && <p style={{ color: colors.textSecondary }}>Nenhuma foto enviada.</p>}
        </div>

        {podeGerenciar && (
          <form onSubmit={handleEnviarFoto} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select style={ui.input} value={tipoFoto} onChange={(e) => setTipoFoto(e.target.value)}>
              <option value="antes">Antes</option>
              <option value="depois">Depois</option>
            </select>
            <input type="file" accept="image/*" onChange={(e) => setArquivoFoto(e.target.files[0])} />
            <button type="submit" style={ui.primaryButton}>
              Enviar foto
            </button>
          </form>
        )}

        {/* Histórico de status */}
        <h2 style={ui.h2}>Histórico</h2>
        <ul style={{ fontSize: "13px", color: colors.textSecondary }}>
          {os.status_log.map((log) => (
            <li key={log.id}>
              {new Date(log.data_hora).toLocaleString("pt-BR")} — {log.status_anterior ? `${NOMES_STATUS[log.status_anterior]} → ` : ""}
              {NOMES_STATUS[log.status_novo]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
