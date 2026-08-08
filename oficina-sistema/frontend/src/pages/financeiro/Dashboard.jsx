import { useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import { apiNext as api } from "../../services/api";
import { styles } from "./financeiroStyles";

function mesAtualCurto() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

const CORES_BARRA = ["#0f172a", "#2563eb", "#0891b2", "#a16207", "#7c3aed", "#dc2626"];

export default function Dashboard() {
  const [mes, setMes] = useState(mesAtualCurto());
  const [dre, setDre] = useState(null);
  const [pontoEquilibrio, setPontoEquilibrio] = useState(null);
  const [evolucao, setEvolucao] = useState([]);
  const [despesasPorCategoria, setDespesasPorCategoria] = useState([]);

  async function carregar() {
    const [resDre, resPe, resEvo, resDespesas] = await Promise.all([
      api.get("/api/financeiro/dashboards/dre", { params: { mes } }),
      api.get("/api/financeiro/dashboards/ponto-equilibrio", { params: { mes } }),
      api.get("/api/financeiro/dashboards/evolucao-mensal", { params: { meses: 6 } }),
      api.get("/api/financeiro/dashboards/despesas-por-categoria", { params: { mes } }),
    ]);
    setDre(resDre.data);
    setPontoEquilibrio(resPe.data);
    setEvolucao(resEvo.data);
    setDespesasPorCategoria(resDespesas.data);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  const maiorReceitaDespesa = Math.max(1, ...evolucao.map((m) => Math.max(Number(m.receita), Number(m.despesa))));
  const totalDespesasCategoria = despesasPorCategoria.reduce((acc, d) => acc + Number(d.valor), 0) || 1;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <NavBar />
      <div style={{ padding: "32px", maxWidth: "1100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ marginTop: 0 }}>Dashboard Financeiro</h1>
          <label style={styles.label}>
            Mês{" "}
            <input type="month" style={{ ...styles.input, width: "160px", display: "inline-block" }} value={mes} onChange={(e) => setMes(e.target.value)} />
          </label>
        </div>

        {dre && (
          <>
            <h2 style={{ fontSize: "16px", marginTop: "24px" }}>DRE Simplificado</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              <LinhaDre label="Receita total" valor={dre.receita_total} />
              <LinhaDre label="(-) Custo de peças/insumos" valor={dre.custo_pecas} negativo />
              <LinhaDre label="(-) Comissões" valor={dre.comissoes} negativo />
              <LinhaDre label="= Margem de contribuição" valor={dre.margem_contribuicao} destaque />
              <LinhaDre label="(-) Despesas fixas" valor={dre.despesas_fixas} negativo />
              <LinhaDre label="= Lucro líquido" valor={dre.lucro_liquido} destaque cor={Number(dre.lucro_liquido) >= 0 ? "#166534" : "#991b1b"} />
            </div>
          </>
        )}

        {pontoEquilibrio && (
          <div style={{ ...styles.card, marginTop: "20px", maxWidth: "360px" }}>
            <p style={styles.statLabel}>Ponto de equilíbrio (faturamento mínimo p/ cobrir custos fixos)</p>
            <p style={styles.statValue}>
              {pontoEquilibrio.ponto_equilibrio !== null ? `R$ ${pontoEquilibrio.ponto_equilibrio}` : "—"}
            </p>
            {pontoEquilibrio.margem_contribuicao_percentual !== null && (
              <p style={{ fontSize: "12px", color: "#64748b" }}>Margem de contribuição: {pontoEquilibrio.margem_contribuicao_percentual}%</p>
            )}
          </div>
        )}

        <h2 style={{ fontSize: "16px", marginTop: "28px" }}>Evolução (últimos 6 meses)</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "700px" }}>
          {evolucao.map((m) => (
            <div key={m.mes}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}>
                <span>{m.mes}</span>
                <span>
                  receita R$ {m.receita} · despesa R$ {m.despesa} ·{" "}
                  <strong style={{ color: Number(m.lucro) >= 0 ? "#166534" : "#991b1b" }}>lucro R$ {m.lucro}</strong>
                </span>
              </div>
              <div style={{ display: "flex", gap: "2px", height: "10px" }}>
                <div style={{ width: `${(Number(m.receita) / maiorReceitaDespesa) * 50}%`, background: "#166534", borderRadius: "4px" }} />
                <div style={{ width: `${(Number(m.despesa) / maiorReceitaDespesa) * 50}%`, background: "#991b1b", borderRadius: "4px" }} />
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: "16px", marginTop: "28px" }}>Despesas por categoria (mês selecionado)</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "700px" }}>
          {despesasPorCategoria.map((d, i) => (
            <div key={d.categoria_id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "140px", fontSize: "13px" }}>{d.categoria_nome}</span>
              <div style={{ flex: 1, background: "#f1f5f9", borderRadius: "6px", overflow: "hidden", height: "18px" }}>
                <div
                  style={{
                    width: `${(Number(d.valor) / totalDespesasCategoria) * 100}%`,
                    background: CORES_BARRA[i % CORES_BARRA.length],
                    height: "100%",
                  }}
                />
              </div>
              <span style={{ width: "100px", fontSize: "13px", textAlign: "right" }}>R$ {d.valor}</span>
            </div>
          ))}
          {despesasPorCategoria.length === 0 && <p style={{ color: "#64748b" }}>Nenhuma despesa neste mês.</p>}
        </div>
      </div>
    </div>
  );
}

function LinhaDre({ label, valor, negativo, destaque, cor }) {
  return (
    <div style={{ ...styles.card, padding: "12px 16px" }}>
      <p style={{ ...styles.statLabel, margin: 0 }}>{label}</p>
      <p
        style={{
          margin: "4px 0 0",
          fontSize: destaque ? "20px" : "16px",
          fontWeight: destaque ? 700 : 500,
          color: cor || (negativo ? "#991b1b" : "#0f172a"),
        }}
      >
        R$ {valor}
      </p>
    </div>
  );
}
