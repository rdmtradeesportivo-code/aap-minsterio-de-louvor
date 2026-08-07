// Ícone único do wordmark "TORQUE" — SVG simples, sem dependência externa.
// Reutilizado na navbar e na tela de login pra manter a mesma marca nos dois
// lugares onde ela aparece.
export default function WrenchIcon({ size = 18, color = "#FF6B00" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.7 6.3a4 4 0 1 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2-2z" />
    </svg>
  );
}
