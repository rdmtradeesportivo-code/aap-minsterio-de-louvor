// Estilos deste domínio agora vêm todos do design system central
// (src/theme.js) — mantido como re-export pra não precisar tocar em cada
// página do financeiro (ContasPagar, ContasReceber, Folha,
// OrcadoRealizado, Dashboard financeiro) e em Relatorios.jsx, que já
// importavam `{ styles }` daqui.
export { ui as styles } from "../../theme";
