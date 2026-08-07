import type { NextRequest } from "next/server";
import { getAuthContext, requirePerfil, authErrorResponse } from "../../../../../lib/auth";
import { parseIdOrNull } from "../../../../../lib/ids";

const PERFIS_GERENCIAR = ["admin", "financeiro", "recepcao"];
const TIPOS_VALIDOS = ["antes", "depois"];
const URL_FOTO_EXPIRA_SEGUNDOS = 60 * 60;

type Params = { params: Promise<{ id: string }> };

function extensaoDe(nomeOriginal: string): string {
  const ponto = nomeOriginal.lastIndexOf(".");
  return ponto === -1 ? ".jpg" : nomeOriginal.slice(ponto).toLowerCase();
}

/** Sobe pro bucket privado `os-fotos` (Supabase Storage) — substitui o
 * `uploads/os_fotos/<os_id>/<arquivo>` em disco local do FastAPI antigo.
 * A visibilidade de cada objeto é controlada pela RLS de storage.objects
 * (mesma regra pode_ver_os), não por um caminho estático servido sem
 * autenticação. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);
    requirePerfil(ctx, PERFIS_GERENCIAR);

    const osId = parseIdOrNull((await params).id);
    if (osId === null) {
      return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });
    }

    const { data: os, error: erroOs } = await ctx.supabase
      .from("ordens_servico")
      .select("id")
      .eq("id", osId)
      .maybeSingle();
    if (erroOs) throw erroOs;
    if (!os) return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });

    const form = await request.formData();
    const tipo = form.get("tipo");
    const arquivo = form.get("arquivo");
    if (typeof tipo !== "string" || !TIPOS_VALIDOS.includes(tipo)) {
      return Response.json({ detail: "tipo deve ser 'antes' ou 'depois'" }, { status: 422 });
    }
    if (!(arquivo instanceof File)) {
      return Response.json({ detail: "arquivo é obrigatório" }, { status: 422 });
    }

    const caminho = `${osId}/${crypto.randomUUID()}${extensaoDe(arquivo.name || "foto.jpg")}`;
    const conteudo = await arquivo.arrayBuffer();

    const { error: erroUpload } = await ctx.supabase.storage
      .from("os-fotos")
      .upload(caminho, conteudo, { contentType: arquivo.type || "image/jpeg" });
    if (erroUpload) throw erroUpload;

    const { data: foto, error: erroInsert } = await ctx.supabase
      .from("os_fotos")
      .insert({ os_id: osId, tipo, caminho_arquivo: caminho })
      .select()
      .single();
    if (erroInsert) throw erroInsert;

    const { data: assinada } = await ctx.supabase.storage
      .from("os-fotos")
      .createSignedUrl(caminho, URL_FOTO_EXPIRA_SEGUNDOS);

    return Response.json({ ...foto, url: assinada?.signedUrl ?? null }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
