// Config vazio e local, só para impedir que o Vite suba até
// /postcss.config.mjs (do app Next.js na raiz do repo) e tente carregar o
// plugin @tailwindcss/postcss, que não é usado neste frontend.
export default {
  plugins: {},
};
