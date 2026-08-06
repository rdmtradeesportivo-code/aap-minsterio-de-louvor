import { Fragment, useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";

const PODE_GERENCIAR = ["admin", "financeiro"];

const PECA_VAZIA = {
  codigo: "",
  descricao: "",
  categoria_id: "",
  fornecedor_id: "",
  unidade_medida: "",
  custo_compra: "",
  preco_venda: "",
  estoque_minimo: "",
};

const ENTRADA_VAZIA = { quantidade: "", custo_unitario: "", vencimento: "", observacao: "" };
const AJUSTE_VAZIO = { quantidade: "", motivo: "", observacao: "" };

export default function PecasList() {
  const { user } = useAuth();
  const podeGerenciar = PODE_GERENCIAR.includes(user?.perfil);

  const [pecas, setPecas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [somenteEstoqueBaixo, setSomenteEstoqueBaixo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [mostrarFormNovaPeca, setMostrarFormNovaPeca] = useState(false);
  const [formPeca, setFormPeca] = useState(PECA_VAZIA);

  const [movimentandoPecaId, setMovimentandoPecaId] = useState(null);
  const [tipoMov, setTipoMov] = useState("entrada");
  const [formEntrada, setFormEntrada] = useState(ENTRADA_VAZIA);
  const [formAjuste, setFormAjuste] = useState(AJUSTE_VAZIO);

  async function carregar() {
    setCarregando(true);
    try {
      const params = somenteEstoqueBaixo ? { somente_estoque_baixo: true } : {};
      const [resPecas, resCategorias, resFornecedores] = await Promise.all([
        api.get("/api/pecas", { params }),
        api.get("/api/categorias-peca"),
        api.get("/api/fornecedores"),
      ]);
      setPecas(resPecas.data);
      setCategorias(resCategorias.data);
      setFornecedores(resFornecedores.data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [somenteEstoqueBaixo]);

  function nomeCategoria(id) {
    return categorias.find((c) => c.id === id)?.nome || "-";
  }

  async function handleCriarPeca(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post("/api/pecas", {
        ...formPeca,
        categoria_id: formPeca.categoria_id ? Number(formPeca.categoria_id) : null,
        fornecedor_id: formPeca.fornecedor_id ? Number(formPeca.fornecedor_id) : null,
        custo_compra: formPeca.custo_compra || 0,
        preco_venda: formPeca.preco_venda || 0,
        estoque_minimo: formPeca.estoque_minimo || 0,
      });
      setFormPeca(PECA_VAZIA);
      setMostrarFormNovaPeca(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível salvar a peça.");
    }
  }

  function abrirMovimentacao(pecaId, tipo) {
    setMovimentandoPecaId(pecaId);
    setTipoMov(tipo);
    setFormEntrada(ENTRADA_VAZIA);
    setFormAjuste(AJUSTE_VAZIO);
    setErro("");
  }

  async function handleSalvarEntrada(e, pecaId) {
    e.preventDefault();
    setErro("");
    try {
      await api.post("/api/estoque/movimentacoes/entrada", {
        peca_id: pecaId,
        quantidade: Number(formEntrada.quantidade),
        custo_unitario: formEntrada.custo_unitario ? Number(formEntrada.custo_unitario) : null,
        vencimento: formEntrada.vencimento,
        observacao: formEntrada.observacao || null,
      });
      setMovimentandoPecaId(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível registrar a entrada.");
    }
  }

  async function handleSalvarAjuste(e, pecaId) {
    e.preventDefault();
    setErro("");
    try {
      await api.post("/api/estoque/movimentacoes/ajuste", {
        peca_id: pecaId,
        quantidade: Number(formAjuste.quantidade),
        motivo: formAjuste.motivo,
        observacao: formAjuste.observacao || null,
      });
      setMovimentandoPecaId(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível registrar o ajuste.");
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <NavBar />

      <div style={{ padding: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ marginTop: 0 }}>Estoque de Peças</h1>
          {podeGerenciar && (
            <button onClick={() => setMostrarFormNovaPeca((v) => !v)} style={styles.primaryButton}>
              {mostrarFormNovaPeca ? "Cancelar" : "+ Nova peça"}
            </button>
          )}
        </div>

        {mostrarFormNovaPeca && (
          <form onSubmit={handleCriarPeca} style={styles.formCard}>
            <div style={styles.formGrid}>
              <label style={styles.label}>
                Código *
                <input
                  required
                  style={styles.input}
                  value={formPeca.codigo}
                  onChange={(e) => setFormPeca({ ...formPeca, codigo: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Descrição *
                <input
                  required
                  style={styles.input}
                  value={formPeca.descricao}
                  onChange={(e) => setFormPeca({ ...formPeca, descricao: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Categoria
                <select
                  style={styles.input}
                  value={formPeca.categoria_id}
                  onChange={(e) => setFormPeca({ ...formPeca, categoria_id: e.target.value })}
                >
                  <option value="">-</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                Fornecedor
                <select
                  style={styles.input}
                  value={formPeca.fornecedor_id}
                  onChange={(e) => setFormPeca({ ...formPeca, fornecedor_id: e.target.value })}
                >
                  <option value="">-</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                Unidade
                <input
                  placeholder="UN, L, KG..."
                  style={styles.input}
                  value={formPeca.unidade_medida}
                  onChange={(e) => setFormPeca({ ...formPeca, unidade_medida: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Estoque mínimo
                <input
                  type="number"
                  step="0.01"
                  style={styles.input}
                  value={formPeca.estoque_minimo}
                  onChange={(e) => setFormPeca({ ...formPeca, estoque_minimo: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Custo de compra
                <input
                  type="number"
                  step="0.01"
                  style={styles.input}
                  value={formPeca.custo_compra}
                  onChange={(e) => setFormPeca({ ...formPeca, custo_compra: e.target.value })}
                />
              </label>
              <label style={styles.label}>
                Preço de venda
                <input
                  type="number"
                  step="0.01"
                  style={styles.input}
                  value={formPeca.preco_venda}
                  onChange={(e) => setFormPeca({ ...formPeca, preco_venda: e.target.value })}
                />
              </label>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b" }}>
              O estoque inicial começa em 0 — registre uma "entrada" logo em seguida para dar
              entrada na quantidade comprada.
            </p>
            {erro && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}
            <button type="submit" style={styles.primaryButton}>
              Salvar peça
            </button>
          </form>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: "6px", margin: "20px 0", fontSize: "14px" }}>
          <input
            type="checkbox"
            checked={somenteEstoqueBaixo}
            onChange={(e) => setSomenteEstoqueBaixo(e.target.checked)}
          />
          Mostrar apenas peças com estoque baixo
        </label>

        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Código</th>
                <th style={styles.th}>Descrição</th>
                <th style={styles.th}>Categoria</th>
                <th style={styles.th}>Estoque</th>
                <th style={styles.th}>Mín.</th>
                <th style={styles.th}>Custo</th>
                <th style={styles.th}>Venda</th>
                {podeGerenciar && <th style={styles.th}></th>}
              </tr>
            </thead>
            <tbody>
              {pecas.map((p) => (
                <Fragment key={p.id}>
                  <tr>
                    <td style={styles.td}>{p.codigo}</td>
                    <td style={styles.td}>{p.descricao}</td>
                    <td style={styles.td}>{nomeCategoria(p.categoria_id)}</td>
                    <td style={styles.td}>
                      {p.estoque_atual} {p.unidade_medida || ""}
                      {p.estoque_baixo && <span style={styles.badge}>estoque baixo</span>}
                    </td>
                    <td style={styles.td}>{p.estoque_minimo}</td>
                    <td style={styles.td}>R$ {p.custo_compra}</td>
                    <td style={styles.td}>R$ {p.preco_venda}</td>
                    {podeGerenciar && (
                      <td style={styles.td}>
                        <button onClick={() => abrirMovimentacao(p.id, "entrada")} style={styles.linkButton}>
                          entrada
                        </button>{" "}
                        <button onClick={() => abrirMovimentacao(p.id, "ajuste")} style={styles.linkButton}>
                          ajuste
                        </button>
                      </td>
                    )}
                  </tr>
                  {movimentandoPecaId === p.id && (
                    <tr>
                      <td style={styles.td} colSpan={8}>
                        {tipoMov === "entrada" ? (
                          <form
                            onSubmit={(e) => handleSalvarEntrada(e, p.id)}
                            style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}
                          >
                            <strong style={{ fontSize: "13px" }}>Entrada (compra):</strong>
                            <input
                              required
                              type="number"
                              step="0.01"
                              placeholder="Quantidade"
                              style={{ ...styles.input, width: "110px" }}
                              value={formEntrada.quantidade}
                              onChange={(e) => setFormEntrada({ ...formEntrada, quantidade: e.target.value })}
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder={`Custo unit. (padrão R$ ${p.custo_compra})`}
                              style={{ ...styles.input, width: "180px" }}
                              value={formEntrada.custo_unitario}
                              onChange={(e) => setFormEntrada({ ...formEntrada, custo_unitario: e.target.value })}
                            />
                            <input
                              required
                              type="date"
                              style={{ ...styles.input, width: "150px" }}
                              value={formEntrada.vencimento}
                              onChange={(e) => setFormEntrada({ ...formEntrada, vencimento: e.target.value })}
                            />
                            <input
                              placeholder="Observação"
                              style={{ ...styles.input, width: "150px" }}
                              value={formEntrada.observacao}
                              onChange={(e) => setFormEntrada({ ...formEntrada, observacao: e.target.value })}
                            />
                            <button type="submit" style={styles.primaryButton}>
                              Salvar
                            </button>
                            <button type="button" onClick={() => setMovimentandoPecaId(null)} style={styles.secondaryButton}>
                              Cancelar
                            </button>
                          </form>
                        ) : (
                          <form
                            onSubmit={(e) => handleSalvarAjuste(e, p.id)}
                            style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}
                          >
                            <strong style={{ fontSize: "13px" }}>Ajuste manual:</strong>
                            <input
                              required
                              type="number"
                              step="0.01"
                              placeholder="Quantidade (+/-)"
                              style={{ ...styles.input, width: "140px" }}
                              value={formAjuste.quantidade}
                              onChange={(e) => setFormAjuste({ ...formAjuste, quantidade: e.target.value })}
                            />
                            <input
                              required
                              placeholder="Motivo (obrigatório)"
                              style={{ ...styles.input, width: "220px" }}
                              value={formAjuste.motivo}
                              onChange={(e) => setFormAjuste({ ...formAjuste, motivo: e.target.value })}
                            />
                            <input
                              placeholder="Observação"
                              style={{ ...styles.input, width: "150px" }}
                              value={formAjuste.observacao}
                              onChange={(e) => setFormAjuste({ ...formAjuste, observacao: e.target.value })}
                            />
                            <button type="submit" style={styles.primaryButton}>
                              Salvar
                            </button>
                            <button type="button" onClick={() => setMovimentandoPecaId(null)} style={styles.secondaryButton}>
                              Cancelar
                            </button>
                          </form>
                        )}
                        {erro && <p style={{ color: "#dc2626", fontSize: "13px", marginTop: "6px" }}>{erro}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {pecas.length === 0 && (
                <tr>
                  <td style={styles.td} colSpan={8}>
                    Nenhuma peça encontrada.
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
  badge: {
    marginLeft: "8px",
    padding: "2px 8px",
    borderRadius: "999px",
    background: "#fef2f2",
    color: "#dc2626",
    fontSize: "11px",
    fontWeight: 600,
  },
  formCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "20px",
    marginTop: "16px",
    maxWidth: "700px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "8px",
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
  table: { width: "100%", borderCollapse: "collapse", maxWidth: "1000px" },
  th: { textAlign: "left", borderBottom: "2px solid #e2e8f0", padding: "8px", fontSize: "13px" },
  td: { borderBottom: "1px solid #f1f5f9", padding: "8px", fontSize: "14px" },
};
