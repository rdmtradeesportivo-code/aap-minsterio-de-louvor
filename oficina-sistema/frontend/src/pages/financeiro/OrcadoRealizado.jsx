import { useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import { apiNext as api } from "../../services/api";
import { styles } from "./financeiroStyles";

function mesAtualCurto() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

export default function OrcadoRealizado() {
  const [mes, setMes] = useState(mesAtualCurto());
  const [itens, setItens] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [categoriaId, setCategoriaId] = useState("");
  const [valorMeta, setValorMeta] = useState("");

  async function carregar() {
    setCarregando(true);
    try {
      const res = await api.get("/api/financeiro/dashboards/orcado-realizado", { params: { mes } });
      setItens(res.data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    api.get("/api/financeiro/categorias-despesa").then((res) => setCategorias(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  async function handleCriarMeta(e) {
    e.preventDefault();
    setErro("");
    try {
      await api.post("/api/financeiro/metas-orcamento", {
        categoria_id: Number(categoriaId),
        mes_referencia: `${mes}-01`,
        valor_meta: Number(valorMeta),
      });
      setCategoriaId("");
      setValorMeta("");
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível salvar a meta.");
    }
  }

  const maiorValor = Math.max(1, ...itens.map((i) => Math.max(Number(i.valor_meta), Number(i.valor_realizado))));

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <NavBar />
      <div style={{ padding: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ marginTop: 0 }}>Orçado x Realizado</h1>
          <button onClick={() => setMostrarForm((v) => !v)} style={styles.primaryButton}>
            {mostrarForm ? "Cancelar" : "+ Definir meta"}
          </button>
        </div>

        <label style={{ ...styles.label, display: "block", marginBottom: "16px" }}>
          Mês
          <input type="month" style={{ ...styles.input, width: "160px" }} value={mes} onChange={(e) => setMes(e.target.value)} />
        </label>

        {mostrarForm && (
          <form onSubmit={handleCriarMeta} style={styles.formCard}>
            <div style={styles.formGrid}>
              <label style={styles.label}>
                Categoria *
                <select required style={styles.input} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.label}>
                Meta mensal (R$) *
                <input required type="number" step="0.01" style={styles.input} value={valorMeta} onChange={(e) => setValorMeta(e.target.value)} />
              </label>
            </div>
            {erro && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}
            <button type="submit" style={styles.primaryButton}>
              Salvar meta
            </button>
          </form>
        )}

        {erro && !mostrarForm && <p style={{ color: "#dc2626", fontSize: "13px" }}>{erro}</p>}

        {carregando ? (
          <p>Carregando...</p>
        ) : (
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "14px", maxWidth: "700px" }}>
            {itens
              .filter((i) => Number(i.valor_meta) > 0 || Number(i.valor_realizado) > 0)
              .map((item) => {
                const percentualBarra = Math.min(100, (Number(item.valor_realizado) / maiorValor) * 100);
                const percentualMetaBarra = item.valor_meta > 0 ? Math.min(100, (Number(item.valor_meta) / maiorValor) * 100) : 0;
                return (
                  <div key={item.categoria_id} style={styles.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <strong>{item.categoria_nome}</strong>
                      <span style={{ fontSize: "13px", color: item.alerta ? "#dc2626" : "#64748b" }}>
                        R$ {item.valor_realizado} / R$ {item.valor_meta}
                        {item.percentual_atingido !== null && ` (${item.percentual_atingido}%)`}
                        {item.alerta && " ⚠"}
                      </span>
                    </div>
                    <div style={{ position: "relative", height: "16px", background: "#f1f5f9", borderRadius: "8px", overflow: "hidden" }}>
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${percentualBarra}%`,
                          background: item.alerta ? "#dc2626" : "#0f172a",
                          borderRadius: "8px",
                        }}
                      />
                      {item.valor_meta > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            left: `${percentualMetaBarra}%`,
                            top: 0,
                            bottom: 0,
                            width: "2px",
                            background: "#f97316",
                          }}
                          title="Meta"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            {itens.filter((i) => Number(i.valor_meta) > 0 || Number(i.valor_realizado) > 0).length === 0 && (
              <p style={{ color: "#64748b" }}>Nenhuma meta ou despesa neste mês.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
