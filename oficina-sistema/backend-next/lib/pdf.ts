import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/** Geração do PDF de orçamento de uma OS, pra envio ao cliente. Réplica em
 * JS puro (pdf-lib, sem dependência de sistema — igual o espírito do
 * fpdf2 usado no FastAPI antigo) do layout de `app/services/pdf.py`:
 * cabeçalho, cliente, veículo, tabela de peças, tabela de serviços, total. */

function moeda(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

function dataPtBr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

interface ItemPecaPdf {
  descricao: string;
  quantidade: number;
  preco_unitario_venda: number;
  subtotal: number;
}

interface ItemServicoPdf {
  descricao: string;
  valor: number;
}

export async function gerarPdfOrcamento(params: {
  numero: number;
  status: string;
  dataAbertura: string;
  prazoEstimado: string | null;
  formaPagamento: string | null;
  clienteNome: string;
  clienteTelefone: string | null;
  clienteCpfCnpj: string | null;
  veiculoLinha: string;
  itensPeca: ItemPecaPdf[];
  itensServico: ItemServicoPdf[];
  valorTotal: number;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page: PDFPage = pdfDoc.addPage([595.28, 841.89]); // A4
  const margem = 40;
  let y = 841.89 - margem;
  const font: PDFFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold: PDFFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const preto = rgb(0.1, 0.1, 0.1);
  const cinza = rgb(0.4, 0.4, 0.4);

  function linha(texto: string, opts: { negrito?: boolean; tamanho?: number; cor?: typeof preto } = {}) {
    if (y < margem + 20) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 841.89 - margem;
    }
    page.drawText(texto, {
      x: margem,
      y,
      size: opts.tamanho ?? 10,
      font: opts.negrito ? fontBold : font,
      color: opts.cor ?? preto,
    });
    y -= (opts.tamanho ?? 10) + 6;
  }

  linha(`Orçamento — OS #${params.numero}`, { negrito: true, tamanho: 18 });
  y -= 4;
  linha(`Status: ${params.status}`, { cor: cinza });
  linha(`Data de abertura: ${dataPtBr(params.dataAbertura)}`, { cor: cinza });
  if (params.prazoEstimado) linha(`Prazo estimado: ${dataPtBr(params.prazoEstimado)}`, { cor: cinza });
  if (params.formaPagamento) linha(`Forma de pagamento: ${params.formaPagamento}`, { cor: cinza });
  y -= 6;

  linha("Cliente", { negrito: true, tamanho: 12 });
  linha(`Nome: ${params.clienteNome}`);
  if (params.clienteTelefone) linha(`Telefone: ${params.clienteTelefone}`);
  if (params.clienteCpfCnpj) linha(`CPF/CNPJ: ${params.clienteCpfCnpj}`);
  y -= 4;

  linha("Veículo", { negrito: true, tamanho: 12 });
  linha(params.veiculoLinha);
  y -= 8;

  if (params.itensPeca.length > 0) {
    linha("Peças", { negrito: true, tamanho: 12 });
    linha(
      `${"Descrição".padEnd(40)}${"Qtd.".padStart(8)}${"Preço unit.".padStart(14)}${"Subtotal".padStart(14)}`,
      { negrito: true, tamanho: 9 }
    );
    for (const item of params.itensPeca) {
      linha(
        `${item.descricao.slice(0, 40).padEnd(40)}${String(item.quantidade).padStart(8)}` +
          `${moeda(item.preco_unitario_venda).padStart(14)}${moeda(item.subtotal).padStart(14)}`,
        { tamanho: 9 }
      );
    }
    y -= 6;
  }

  if (params.itensServico.length > 0) {
    linha("Serviços", { negrito: true, tamanho: 12 });
    linha(`${"Descrição".padEnd(60)}${"Valor".padStart(14)}`, { negrito: true, tamanho: 9 });
    for (const item of params.itensServico) {
      linha(`${item.descricao.slice(0, 60).padEnd(60)}${moeda(item.valor).padStart(14)}`, { tamanho: 9 });
    }
    y -= 6;
  }

  linha(`Total: ${moeda(params.valorTotal)}`, { negrito: true, tamanho: 14 });

  return pdfDoc.save();
}
