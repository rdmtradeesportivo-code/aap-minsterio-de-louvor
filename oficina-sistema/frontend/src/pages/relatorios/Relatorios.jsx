import { useEffect, useState } from "react";
import NavBar from "../../components/NavBar";
import { apiNext as api } from "../../services/api";
import { styles } from "../financeiro/financeiroStyles";

function mesAtualCurto() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

const CORES_BARRA = ["#0f172a", "#2563eb", "#0891b2", "#a16207", "#7c3aed", "#dc2626"];

export default function Relatorios() {
  const [mes, setMes] = useState(mesAtualCurto());
  const [faturamento, setFaturamento] = useState(null);
  const [lucroPorOs, setLucroPorOs] = useState([]);
  const [inadimplencia, setInadimplencia] = useState([]);
  const [ranking, setRanking] = useState([]);

  async function carregar() {
    const [resFat, resLucro, resInad, resRanking] = await Promise.all([
      api.get("/api/relatorios/faturamento", { params: { mes } }),
      api.get("/api/relatorios/lucro-por-os", { params: { mes } }),
      api.get("/api/relatorios/inadimplencia"),
      api.get("/api/relatorios/ranking-servicos", { params: { mes } }),
    ]);
    setFaturamento(resFat.data);
    setLucroPorOs(resLucro.data);
    setInadimplencia(resInad.data);
    setRanking(resRanking.data);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  const maiorValorRanking = Math.max(1, ...ranking.map((r) => Number(r.valor_total)));
  const totalAtrasado = inadimplencia.reduce((acc, i) => acc + Number(i.valor_total_atrasado), 0);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <NavBar />
      <div style={{ padding: "32px", maxWidth: "1100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ marginTop: 0 }}>Relatórios Gerais</h1>
          <label style={styles.label}>
            Mês{" "}
            <input
              type="month"
              style={{ ...styles.input, width: "160px", display: "inline-block" }}
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </label>
        </div>
        <p style={{ color: "#64748b", fontSize: "13px", marginTop: "-4px" }}>
          Faturamento, lucro por OS e ranking de serviços consideram apenas OS que chegaram a "faturado" no
          mês selecionado — OS canceladas nunca entram nesses números, mesmo que já tivessem itens
          lançados. Inadimplência não depende do mês: mostra todas as contas a receber vencidas e não
          pagas, de qualquer período.
        </p>

        {faturamento && (
          <div style={{ ...styles.card, marginTop: "12px", maxWidth: "420px" }}>
            <p style={styles.statLabel}>Faturamento do mês ({faturamento.quantidade_os} OS faturada{faturamento.quantidade_os === 1 ? "" : "s"})</p>
            <p style={styles.statValue}>R$ {faturamento.valor_total}</p>
          </div>
        )}

        <h2 style={{ fontSize: "16px", marginTop: "28px" }}>Lucro por OS</h2>
        <p style={{ color: "#64748b", fontSize: "12px", marginTop: "-6px" }}>
          Custo de peças usa o custo snapshotado no momento da venda — se o preço de compra da peça mudar
          depois, o lucro histórico da OS não muda.
        </p>
        <table style={styles.table} className="data-table">
          <thead>
            <tr>
              <th style={styles.th}>OS</th>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Faturada em</th>
              <th style={styles.th}>Receita</th>
              <th style={styles.th}>Custo peças</th>
              <th style={styles.th}>Comissões</th>
              <th style={styles.th}>Lucro</th>
              <th style={styles.th}>Margem</th>
            </tr>
          </thead>
          <tbody>
            {lucroPorOs.map((item) => (
              <tr key={item.os_id}>
                <td style={styles.td}>#{item.numero}</td>
                <td style={styles.td}>{item.cliente_nome}</td>
                <td style={styles.td}>
                  {item.data_faturamento ? new Date(item.data_faturamento).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td style={styles.td}>R$ {item.receita}</td>
                <td style={styles.td}>R$ {item.custo_pecas}</td>
                <td style={styles.td}>R$ {item.comissoes}</td>
                <td style={{ ...styles.td, fontWeight: 600, color: Number(item.lucro) >= 0 ? "#166534" : "#991b1b" }}>
                  R$ {item.lucro}
                </td>
                <td style={styles.td}>{item.margem_percentual !== null ? `${item.margem_percentual}%` : "—"}</td>
              </tr>
            ))}
            {lucroPorOs.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={8}>
                  Nenhuma OS faturada neste mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <h2 style={{ fontSize: "16px", marginTop: "28px" }}>Ranking de serviços mais vendidos (mês selecionado)</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "700px" }}>
          {ranking.map((r, i) => (
            <div key={r.descricao} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "260px", fontSize: "13px" }}>{r.descricao}</span>
              <div style={{ flex: 1, background: "#f1f5f9", borderRadius: "6px", overflow: "hidden", height: "18px" }}>
                <div
                  style={{
                    width: `${(Number(r.valor_total) / maiorValorRanking) * 100}%`,
                    background: CORES_BARRA[i % CORES_BARRA.length],
                    height: "100%",
                  }}
                />
              </div>
              <span style={{ width: "70px", fontSize: "13px", textAlign: "right" }}>{r.quantidade}x</span>
              <span style={{ width: "100px", fontSize: "13px", textAlign: "right" }}>R$ {r.valor_total}</span>
            </div>
          ))}
          {ranking.length === 0 && <p style={{ color: "#64748b" }}>Nenhum serviço faturado neste mês.</p>}
        </div>

        <h2 style={{ fontSize: "16px", marginTop: "28px" }}>Inadimplência de clientes</h2>
        {inadimplencia.length > 0 && (
          <p style={{ color: "#991b1b", fontSize: "13px", fontWeight: 600, marginTop: "-6px" }}>
            Total em atraso: R$ {totalAtrasado.toFixed(2)}
          </p>
        )}
        <table style={styles.table} className="data-table">
          <thead>
            <tr>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Contas atrasadas</th>
              <th style={styles.th}>Valor total atrasado</th>
              <th style={styles.th}>Vencimento mais antigo</th>
            </tr>
          </thead>
          <tbody>
            {inadimplencia.map((i) => (
              <tr key={i.cliente_id}>
                <td style={styles.td}>{i.cliente_nome}</td>
                <td style={styles.td}>{i.quantidade_contas}</td>
                <td style={{ ...styles.td, color: "#991b1b", fontWeight: 600 }}>R$ {i.valor_total_atrasado}</td>
                <td style={styles.td}>
                  {i.conta_mais_antiga_vencimento
                    ? new Date(i.conta_mais_antiga_vencimento + "T00:00:00").toLocaleDateString("pt-BR")
                    : "—"}
                </td>
              </tr>
            ))}
            {inadimplencia.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={4}>
                  Nenhum cliente inadimplente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
