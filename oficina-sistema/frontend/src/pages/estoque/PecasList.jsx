import { Fragment, useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import { colors, ui } from "../../theme";

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
    <div style={ui.page}>
      <NavBar />

      <div style={ui.content}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={ui.h1}>Estoque de Peças</h1>
          {podeGerenciar && (
            <button onClick={() => setMostrarFormNovaPeca((v) => !v)} style={ui.primaryButton}>
              {mostrarFormNovaPeca ? "Cancelar" : "+ Nova peça"}
            </button>
          )}
        </div>

        {mostrarFormNovaPeca && (
          <form onSubmit={handleCriarPeca} style={ui.formCard}>
            <div style={ui.formGrid}>
              <label style={ui.label}>
                Código *
                <input
                  required
                  style={ui.input}
                  value={formPeca.codigo}
                  onChange={(e) => setFormPeca({ ...formPeca, codigo: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                Descrição *
                <input
                  required
                  style={ui.input}
                  value={formPeca.descricao}
                  onChange={(e) => setFormPeca({ ...formPeca, descricao: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                Categoria
                <select
                  style={ui.input}
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
              <label style={ui.label}>
                Fornecedor
                <select
                  style={ui.input}
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
              <label style={ui.label}>
                Unidade
                <input
                  placeholder="UN, L, KG..."
                  style={ui.input}
                  value={formPeca.unidade_medida}
                  onChange={(e) => setFormPeca({ ...formPeca, unidade_medida: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                Estoque mínimo
                <input
                  type="number"
                  step="0.01"
                  style={ui.input}
                  value={formPeca.estoque_minimo}
                  onChange={(e) => setFormPeca({ ...formPeca, estoque_minimo: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                Custo de compra
                <input
                  type="number"
                  step="0.01"
                  style={ui.input}
                  value={formPeca.custo_compra}
                  onChange={(e) => setFormPeca({ ...formPeca, custo_compra: e.target.value })}
                />
              </label>
              <label style={ui.label}>
                Preço de venda
                <input
                  type="number"
                  step="0.01"
                  style={ui.input}
                  value={formPeca.preco_venda}
                  onChange={(e) => setFormPeca({ ...formPeca, preco_venda: e.target.value })}
                />
              </label>
            </div>
            <p style={{ fontSize: "12px", color: colors.textSecondary }}>
              O estoque inicial começa em 0 — registre uma "entrada" logo em seguida para dar
              entrada na quantidade comprada.
            </p>
            {erro && <p style={{ color: colors.danger, fontSize: "13px" }}>{erro}</p>}
            <button type="submit" style={ui.primaryButton}>
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
          <table style={ui.table} className="data-table">
            <thead>
              <tr>
                <th style={ui.th}>Código</th>
                <th style={ui.th}>Descrição</th>
                <th style={ui.th}>Categoria</th>
                <th style={ui.th}>Estoque</th>
                <th style={ui.th}>Mín.</th>
                <th style={ui.th}>Custo</th>
                <th style={ui.th}>Venda</th>
                {podeGerenciar && <th style={ui.th}></th>}
              </tr>
            </thead>
            <tbody>
              {pecas.map((p) => (
                <Fragment key={p.id}>
                  <tr>
                    <td style={ui.td}>{p.codigo}</td>
                    <td style={ui.td}>{p.descricao}</td>
                    <td style={ui.td}>{nomeCategoria(p.categoria_id)}</td>
                    <td style={ui.td}>
                      {p.estoque_atual} {p.unidade_medida || ""}
                      {p.estoque_baixo && <span style={ui.badge}>estoque baixo</span>}
                    </td>
                    <td style={ui.td}>{p.estoque_minimo}</td>
                    <td style={ui.td}>R$ {p.custo_compra}</td>
                    <td style={ui.td}>R$ {p.preco_venda}</td>
                    {podeGerenciar && (
                      <td style={ui.td}>
                        <button onClick={() => abrirMovimentacao(p.id, "entrada")} style={ui.linkButton}>
                          entrada
                        </button>{" "}
                        <button onClick={() => abrirMovimentacao(p.id, "ajuste")} style={ui.linkButton}>
                          ajuste
                        </button>
                      </td>
                    )}
                  </tr>
                  {movimentandoPecaId === p.id && (
                    <tr>
                      <td style={ui.td} colSpan={8}>
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
                              style={{ ...ui.input, width: "110px" }}
                              value={formEntrada.quantidade}
                              onChange={(e) => setFormEntrada({ ...formEntrada, quantidade: e.target.value })}
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder={`Custo unit. (padrão R$ ${p.custo_compra})`}
                              style={{ ...ui.input, width: "180px" }}
                              value={formEntrada.custo_unitario}
                              onChange={(e) => setFormEntrada({ ...formEntrada, custo_unitario: e.target.value })}
                            />
                            <input
                              required
                              type="date"
                              style={{ ...ui.input, width: "150px" }}
                              value={formEntrada.vencimento}
                              onChange={(e) => setFormEntrada({ ...formEntrada, vencimento: e.target.value })}
                            />
                            <input
                              placeholder="Observação"
                              style={{ ...ui.input, width: "150px" }}
                              value={formEntrada.observacao}
                              onChange={(e) => setFormEntrada({ ...formEntrada, observacao: e.target.value })}
                            />
                            <button type="submit" style={ui.primaryButton}>
                              Salvar
                            </button>
                            <button type="button" onClick={() => setMovimentandoPecaId(null)} style={ui.secondaryButton}>
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
                              style={{ ...ui.input, width: "140px" }}
                              value={formAjuste.quantidade}
                              onChange={(e) => setFormAjuste({ ...formAjuste, quantidade: e.target.value })}
                            />
                            <input
                              required
                              placeholder="Motivo (obrigatório)"
                              style={{ ...ui.input, width: "220px" }}
                              value={formAjuste.motivo}
                              onChange={(e) => setFormAjuste({ ...formAjuste, motivo: e.target.value })}
                            />
                            <input
                              placeholder="Observação"
                              style={{ ...ui.input, width: "150px" }}
                              value={formAjuste.observacao}
                              onChange={(e) => setFormAjuste({ ...formAjuste, observacao: e.target.value })}
                            />
                            <button type="submit" style={ui.primaryButton}>
                              Salvar
                            </button>
                            <button type="button" onClick={() => setMovimentandoPecaId(null)} style={ui.secondaryButton}>
                              Cancelar
                            </button>
                          </form>
                        )}
                        {erro && <p style={{ color: colors.danger, fontSize: "13px", marginTop: "6px" }}>{erro}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {pecas.length === 0 && (
                <tr>
                  <td style={ui.td} colSpan={8}>
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
