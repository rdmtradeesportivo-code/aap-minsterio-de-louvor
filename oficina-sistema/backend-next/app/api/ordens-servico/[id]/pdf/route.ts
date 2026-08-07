import type { NextRequest } from "next/server";
import { getAuthContext, authErrorResponse } from "../../../../../lib/auth";
import { parseIdOrNull } from "../../../../../lib/ids";
import { valorTotalOs } from "../../../../../lib/os";
import { gerarPdfOrcamento } from "../../../../../lib/pdf";

type Params = { params: Promise<{ id: string }> };

// Sem restrição de perfil além de estar logado — igual o FastAPI antigo,
// a visibilidade real vem da RLS (pode_ver_os): o mecânico só consegue
// gerar o PDF de uma OS em que ele está envolvido.
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await getAuthContext(request);

    const osId = parseIdOrNull((await params).id);
    if (osId === null) {
      return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });
    }

    const { data: os, error } = await ctx.supabase
      .from("ordens_servico")
      .select(
        "*, cliente:clientes(nome,telefone,cpf_cnpj), veiculo:veiculos(placa,modelo,marca,ano), itens_peca:os_itens_peca(*), itens_servico:os_itens_servico(*)"
      )
      .eq("id", osId)
      .maybeSingle();
    if (error) throw error;
    if (!os) return Response.json({ detail: "Ordem de serviço não encontrada" }, { status: 404 });

    const pecaIds = os.itens_peca.map((item: any) => item.peca_id);
    const { data: pecas } = pecaIds.length
      ? await ctx.supabase.from("pecas").select("id, descricao").in("id", pecaIds)
      : { data: [] as any[] };
    const descricaoPeca = new Map((pecas ?? []).map((p: any) => [p.id, p.descricao]));

    const itensPeca = os.itens_peca.map((item: any) => ({
      descricao: descricaoPeca.get(item.peca_id) ?? `Peça #${item.peca_id}`,
      quantidade: Number(item.quantidade),
      preco_unitario_venda: Number(item.preco_unitario_venda),
      subtotal: Number(item.quantidade) * Number(item.preco_unitario_venda),
    }));

    const veiculo = os.veiculo;
    const veiculoLinha = `${[veiculo?.marca, veiculo?.modelo, veiculo?.ano].filter(Boolean).join(" ")} — Placa ${veiculo?.placa ?? "-"}`;

    const pdfBytes = await gerarPdfOrcamento({
      numero: os.numero,
      status: os.status,
      dataAbertura: os.data_abertura,
      prazoEstimado: os.prazo_estimado,
      formaPagamento: os.forma_pagamento,
      clienteNome: os.cliente?.nome ?? "-",
      clienteTelefone: os.cliente?.telefone ?? null,
      clienteCpfCnpj: os.cliente?.cpf_cnpj ?? null,
      veiculoLinha,
      itensPeca,
      itensServico: os.itens_servico.map((item: any) => ({ descricao: item.descricao, valor: Number(item.valor) })),
      valorTotal: valorTotalOs(os.itens_peca, os.itens_servico),
    });

    return new Response(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=orcamento-os-${os.numero}.pdf`,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
