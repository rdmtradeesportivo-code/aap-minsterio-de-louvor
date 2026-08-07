import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../lib/auth";
import { parseIdOrNull } from "../../../../lib/ids";
import { SELECT_OS_DETALHE, comValorTotal } from "../../../../lib/os";

const PERFIS_GERENCIAR = ["admin", "financeiro", "recepcao"];
const CAMPOS_ATUALIZAVEIS = ["prazo_estimado", "forma_pagamento"] as const;
const URL_FOTO_EXPIRA_SEGUNDOS = 60 * 60; // 1h — só precisa durar o tempo de exibir a tela

type Params = { params: Promise<{ id: string }> };

/** Assina a URL de cada foto sob demanda — o bucket é privado (a
 * visibilidade de cada objeto espelha `pode_ver_os`, ver migration da
 * Storage), então não existe uma URL pública fixa como no FastAPI antigo
 * (`/uploads/...` servido por StaticFiles sem autenticação). */
async function comUrlsDeFotos(ctx: Awaited<ReturnType<typeof getAuthContext>>, os: any) {
  if (!os.fotos?.length) return os;
  const fotos = await Promise.all(
    os.fotos.map(async (foto: any) => {
      const { data } = await ctx.supabase.storage
        .from("os-fotos")
        .createSignedUrl(foto.caminho_arquivo, URL_FOTO_EXPIRA_SEGUNDOS);
      return { ...foto, url: data?.signedUrl ?? null };
    })
  );
  return { ...os, fotos };
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);

    const osId = parseIdOrNull((await params).id);
    if (osId === null) {
      return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });
    }

    const { data, error } = await ctx.supabase
      .from("ordens_servico")
      .select(SELECT_OS_DETALHE)
      .eq("id", osId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });

    return Response.json(comValorTotal(await comUrlsDeFotos(ctx, data)));
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const osId = parseIdOrNull((await params).id);
    if (osId === null) {
      return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const payload: Record<string, unknown> = {};
    for (const campo of CAMPOS_ATUALIZAVEIS) {
      if (body[campo] !== undefined) payload[campo] = body[campo];
    }

    const { data, error } = await ctx.supabase
      .from("ordens_servico")
      .update(payload)
      .eq("id", osId)
      .select(SELECT_OS_DETALHE)
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });

    return Response.json(comValorTotal(await comUrlsDeFotos(ctx, data)));
  } catch (err) {
    return authErrorResponse(err);
  }
}
