import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Nomeado "proxy" (não "middleware") — convenção renomeada no Next.js 16.
// Roda em toda /api/* antes da rota. Faz só CORS aqui: a validação de
// verdade do Bearer token e do perfil fica em cada Route Handler
// (lib/auth.ts), porque a própria doc do Next.js 16 avisa pra não confiar
// só no proxy pra autorização — um matcher mal configurado pode
// silenciosamente deixar de proteger uma rota, e RLS + checagem por rota
// são a defesa que continua de pé mesmo assim.
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://oficina-funilaria.vercel.app",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return NextResponse.json({}, { headers });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
