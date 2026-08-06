import { Fragment, useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import api from "../../services/api";
import { styles } from "./financeiroStyles";

const STATUS_LABEL = { aberto: "Aberto", fechado: "Fechado", pago: "Pago" };
const STATUS_COR = {
  aberto: { bg: "#fef9c3", fg: "#a16207" },
  fechado: { bg: "#dbeafe", fg: "#1d4ed8" },
  pago: { bg: "#dcfce7", fg: "#166534" },
};

function mesAtualISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function Folha() {
  const [folhas, setFolhas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [funcionarioId, setFuncionarioId] = useState("");
  const [mesReferencia, setMesReferencia] = useState(mesAtualISO());

  const [descontoAberto, setDescontoAberto] = useState(null); // folha_id
  const [descricaoDesconto, setDescricaoDesconto] = useState("");
  const [valorDesconto, setValorDesconto] = useState("");

  async function carregar() {
    setCarregando(true);
    try {
      const res = await api.get("/api/folha");
      setFolhas(res.data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    api.get("/api/funcionarios").then((res) => setFuncionarios(res.data));
  }, []);

  function nomeFuncionario(id) {
    return funcionarios.find((f) => f.id === id)?.nome || `Funcionário #${id}`;
  }

  async function handleAbrir(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post("/api/folha", { funcionario_id: Number(funcionarioId), mes_referencia: mesReferencia });
      setFuncionarioId("");
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível abrir a folha.");
    }
  }

  async function handleAdicionarDesconto(e, folhaId) {
    e.preventDefault();
    setErro("");
    try {
      await api.post(`/api/folha/${folhaId}/descontos`, { descricao: descricaoDesconto, valor: Number(valorDesconto) });
      setDescontoAberto(null);
      setDescricaoDesconto("");
      setValorDesconto("");
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível adicionar o desconto.");
    }
  }

  async function handleFechar(folhaId) {
    setErro("");
    try {
      await api.post(`/api/folha/${folhaId}/fechar`);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível fechar a folha.");
    }
  }

  async function handlePagar(folhaId) {
    setErro("");
    try {
      await api.post(`/api/folha/${folhaId}/pagar`);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível pagar a folha.");
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <NavBar />
      <div style={{ padding: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ marginTop: 0 }}>Folha de Pagamento</h1>
          <button onClick={() => setMostrarForm((v) => !v)} style={styles.primaryButton}>
            {mostrarForm ? "Cancelar" : "+ Abrir folha"}
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={handleAbrir} style={styles.formCard}>
            <div style={styles.formGrid}>
              <label style={styles.label}>
                Funcionário *
                <select required style={styles.input} value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {funcionarios.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} (salário base R$ {f.salario_base})
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                Mês de referência *
                <input required type="date" style={styles.input} value={mesReferencia} onChange={(e) => setMesReferencia(e.target.value)} />
              </label>
            </div>
            {erro && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}
            <button type="submit" style={styles.primaryButton}>
              Abrir folha
            </button>
          </form>
        )}

        {erro && !mostrarForm && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}

        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <table style={{ ...styles.table, marginTop: "20px" }}>
            <thead>
              <tr>
                <th style={styles.th}>Funcionário</th>
                <th style={styles.th}>Mês</th>
                <th style={styles.th}>Salário base</th>
                <th style={styles.th}>Comissões</th>
                <th style={styles.th}>Descontos</th>
                <th style={styles.th}>Líquido</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {folhas.map((f) => (
                <Fragment key={f.id}>
                  <tr>
                    <td style={styles.td}>{nomeFuncionario(f.funcionario_id)}</td>
                    <td style={styles.td}>{f.mes_referencia}</td>
                    <td style={styles.td}>R$ {f.salario_base}</td>
                    <td style={styles.td}>R$ {f.total_comissoes}</td>
                    <td style={styles.td}>R$ {f.total_descontos}</td>
                    <td style={styles.td}>
                      <strong>R$ {f.valor_liquido}</strong>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          background: STATUS_COR[f.status].bg,
                          color: STATUS_COR[f.status].fg,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {STATUS_LABEL[f.status]}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {f.status === "aberto" && (
                        <>
                          <button onClick={() => setDescontoAberto(descontoAberto === f.id ? null : f.id)} style={styles.linkButton}>
                            + desconto
                          </button>{" "}
                          <button onClick={() => handleFechar(f.id)} style={styles.linkButton}>
                            fechar
                          </button>
                        </>
                      )}
                      {f.status === "fechado" && (
                        <button onClick={() => handlePagar(f.id)} style={styles.linkButton}>
                          marcar como paga
                        </button>
                      )}
                    </td>
                  </tr>
                  {f.descontos?.length > 0 && (
                    <tr>
                      <td style={{ ...styles.td, fontSize: "12px", color: "#64748b" }} colSpan={8}>
                        Descontos: {f.descontos.map((d) => `${d.descricao} (R$ ${d.valor})`).join(", ")}
                      </td>
                    </tr>
                  )}
                  {descontoAberto === f.id && (
                    <tr>
                      <td style={styles.td} colSpan={8}>
                        <form onSubmit={(e) => handleAdicionarDesconto(e, f.id)} style={{ display: "flex", gap: "8px" }}>
                          <input
                            required
                            placeholder="Descrição (vale, adiantamento...)"
                            style={{ ...styles.input, width: "220px" }}
                            value={descricaoDesconto}
                            onChange={(e) => setDescricaoDesconto(e.target.value)}
                          />
                          <input
                            required
                            type="number"
                            step="0.01"
                            placeholder="Valor"
                            style={{ ...styles.input, width: "120px" }}
                            value={valorDesconto}
                            onChange={(e) => setValorDesconto(e.target.value)}
                          />
                          <button type="submit" style={styles.primaryButton}>
                            Adicionar
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {folhas.length === 0 && (
                <tr>
                  <td style={styles.td} colSpan={8}>
                    Nenhuma folha encontrada.
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
