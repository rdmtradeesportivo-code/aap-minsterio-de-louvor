import { CORES_STATUS, NOMES_STATUS } from "../pages/os/statusUtils";

export default function StatusBadge({ status }) {
  const cor = CORES_STATUS[status] || { bg: "#f1f5f9", fg: "#475569" };
  return (
    <span
      style={{
        background: cor.bg,
        color: cor.fg,
        padding: "2px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {NOMES_STATUS[status] || status}
    </span>
  );
}
