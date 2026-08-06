export const NOMES_STATUS = {
  orcamento: "Orçamento",
  aprovado: "Aprovado",
  em_execucao: "Em execução",
  aguardando_peca: "Aguardando peça",
  concluido: "Concluído",
  faturado: "Faturado",
  pago: "Pago",
  cancelado: "Cancelado",
};

export const CORES_STATUS = {
  orcamento: { bg: "#f1f5f9", fg: "#475569" },
  aprovado: { bg: "#dbeafe", fg: "#1d4ed8" },
  em_execucao: { bg: "#fef9c3", fg: "#a16207" },
  aguardando_peca: { bg: "#ffedd5", fg: "#c2410c" },
  concluido: { bg: "#dcfce7", fg: "#15803d" },
  faturado: { bg: "#cffafe", fg: "#0e7490" },
  pago: { bg: "#dcfce7", fg: "#166534" },
  cancelado: { bg: "#fee2e2", fg: "#991b1b" },
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
  cancelado: [],
};

// Espelha app/models/ordem_servico.py::STATUS_ANTES_DE_FATURAR — cancelar só
// é permitido antes de faturada (depois, só existiria estorno/nota de
// crédito, fora de escopo).
export const STATUS_CANCELAVEIS = [
  "orcamento",
  "aprovado",
  "em_execucao",
  "aguardando_peca",
  "concluido",
];
