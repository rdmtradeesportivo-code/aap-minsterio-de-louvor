// Identidade visual "Torque" — grafite industrial + laranja de sinalização.
// Paleta e tipografia centralizadas aqui; todo componente novo deve importar
// daqui em vez de inventar cor solta, pra manter consistência conforme o
// sistema cresce módulo a módulo (ver prompt de rebranding).

export const colors = {
  // Base escura (navbar, tela de login) — grafite, nunca preto puro: remete
  // a metal/ferramenta sem pesar demais.
  graphite: "#1A1A1D",
  graphiteAlt: "#232327",
  graphiteInput: "#1F1F23",
  graphiteBorder: "#3F3F46",

  // O resto do sistema (a maior parte das telas — tabelas, formulários)
  // fica sobre fundo claro: mais legível ao longo de um turno de trabalho
  // inteiro do que uma aplicação inteira em modo escuro.
  pageBg: "#F4F4F5",
  surface: "#FFFFFF",
  border: "#E4E4E7",

  textPrimary: "#1A1A1D",
  textSecondary: "#71717A", // cinza-aço
  textOnDark: "#F4F4F5",
  textOnDarkMuted: "#A1A1AA",

  // Cor de ação — laranja de sinalização industrial.
  accent: "#FF6B00",
  accentHover: "#E05F00",
  accentSoft: "#FFEDE0",

  success: "#15803D",
  successBg: "#DCFCE7",
  danger: "#B91C1C",
  dangerBg: "#FEE2E2",
  warning: "#A16207",
  warningBg: "#FEF9C3",
  info: "#0E7490",
  infoBg: "#CFFAFE",
};

export const fonts = {
  // Peso forte e condensado pra títulos — passa solidez sem virar exagero.
  heading: '"Oswald", "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
  // Fonte de sistema pro corpo/tabelas — prioriza legibilidade nas telas com
  // muito dado tabular, onde uma fonte "de efeito" cansaria a leitura.
  body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

// Estilos reutilizáveis compartilhados por todas as páginas — evita cada
// módulo reinventar sua própria paleta de botão/tabela/card.
export const ui = {
  page: {
    fontFamily: fonts.body,
    background: colors.pageBg,
    minHeight: "100vh",
    color: colors.textPrimary,
  },
  content: {
    padding: "32px",
  },
  h1: {
    fontFamily: fonts.heading,
    fontWeight: 700,
    letterSpacing: "0.3px",
    fontSize: "26px",
    margin: 0,
    color: colors.textPrimary,
  },
  h2: {
    fontFamily: fonts.heading,
    fontWeight: 600,
    fontSize: "18px",
    marginTop: "28px",
    marginBottom: "8px",
    color: colors.textPrimary,
  },
  primaryButton: {
    padding: "9px 16px",
    borderRadius: "6px",
    border: "none",
    background: colors.accent,
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: fonts.body,
  },
  secondaryButton: {
    padding: "8px 14px",
    borderRadius: "6px",
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.textPrimary,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    fontFamily: fonts.body,
  },
  dangerButton: {
    padding: "8px 14px",
    borderRadius: "6px",
    border: "1px solid #fca5a5",
    background: colors.surface,
    color: colors.danger,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    fontFamily: fonts.body,
  },
  linkButton: {
    border: "none",
    background: "none",
    color: colors.accent,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
    textDecoration: "underline",
    padding: 0,
    fontFamily: fonts.body,
  },
  formCard: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: "10px",
    padding: "20px",
    marginTop: "16px",
    maxWidth: "700px",
    boxShadow: "0 1px 2px rgba(26,26,29,0.05)",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  },
  formGrid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  },
  label: { fontSize: "13px", color: colors.textSecondary, fontWeight: 500 },
  input: {
    display: "block",
    width: "100%",
    padding: "8px 10px",
    marginTop: "4px",
    borderRadius: "6px",
    border: `1px solid ${colors.border}`,
    fontSize: "14px",
    boxSizing: "border-box",
    fontFamily: fonts.body,
    color: colors.textPrimary,
    background: colors.surface,
  },
  table: {
    width: "100%",
    maxWidth: "1000px",
    borderCollapse: "collapse",
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    overflow: "hidden",
  },
  th: {
    textAlign: "left",
    background: colors.graphite,
    color: colors.textOnDark,
    padding: "10px 12px",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  td: {
    borderBottom: `1px solid ${colors.border}`,
    padding: "10px 12px",
    fontSize: "14px",
    color: colors.textPrimary,
  },
  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 1px 2px rgba(26,26,29,0.05)",
  },
  statValue: { fontSize: "26px", fontWeight: 700, margin: "4px 0", fontFamily: fonts.heading },
  statLabel: { fontSize: "13px", color: colors.textSecondary },
  badge: {
    marginLeft: "8px",
    padding: "2px 8px",
    borderRadius: "999px",
    background: colors.dangerBg,
    color: colors.danger,
    fontSize: "11px",
    fontWeight: 600,
  },
};
