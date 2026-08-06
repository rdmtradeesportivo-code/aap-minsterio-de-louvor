export const NOMES_STATUS = {
  orcamento: "Orçamento",
  aprovado: "Aprovado",
  em_execucao: "Em execução",
  aguardando_peca: "Aguardando peça",
  concluido: "Concluído",
  faturado: "Faturado",
  pago: "Pago",
};

export const CORES_STATUS = {
  orcamento: { bg: "#f1f5f9", fg: "#475569" },
  aprovado: { bg: "#dbeafe", fg: "#1d4ed8" },
  em_execucao: { bg: "#fef9c3", fg: "#a16207" },
  aguardando_peca: { bg: "#ffedd5", fg: "#c2410c" },
  concluido: { bg: "#dcfce7", fg: "#15803d" },
  faturado: { bg: "#cffafe", fg: "#0e7490" },
  pago: { bg: "#dcfce7", fg: "#166534" },
};

// Espelha app/services/ordem_servico.py::TRANSICOES_PERMITIDAS (exceto
// "faturado", que só existe via endpoint dedicado /faturar).
export const TRANSICOES_PERMITIDAS = {
  orcamento: ["aprovado"],
  aprovado: ["em_execucao"],
  em_execucao: ["aguardando_peca", "concluido"],
  aguardando_peca: ["em_execucao"],
  concluido: [],
  faturado: ["pago"],
  pago: [],
};
