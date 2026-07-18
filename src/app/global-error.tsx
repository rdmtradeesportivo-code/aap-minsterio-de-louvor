"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            fontFamily: "system-ui, sans-serif",
            background: "#faf9fc",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              textAlign: "center",
              background: "white",
              borderRadius: "1rem",
              padding: "2rem",
              boxShadow: "0 1px 2px rgba(30,27,46,0.08)",
            }}
          >
            <h1 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1e1b2e" }}>
              Algo deu errado
            </h1>
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#64748b" }}>
              Ocorreu um erro inesperado ao carregar o aplicativo.
            </p>
            {error.message && (
              <p
                style={{
                  marginTop: "0.75rem",
                  background: "#f8fafc",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                  textAlign: "left",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: "#64748b",
                  overflowX: "auto",
                }}
              >
                {error.message}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                marginTop: "1.25rem",
                background: "linear-gradient(to bottom right, #7c3aed, #4f46e5)",
                color: "white",
                border: "none",
                borderRadius: "0.75rem",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
