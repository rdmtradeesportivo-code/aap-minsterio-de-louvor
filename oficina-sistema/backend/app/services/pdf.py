"""Geração do PDF de orçamento de uma Ordem de Serviço, para envio ao
cliente. Implementação enxuta com fpdf2 (puro Python, sem dependência de
sistema) — formatação rica (logo, cabeçalho da oficina, etc.) fica para uma
iteração futura quando houver identidade visual definida.
"""

from decimal import Decimal

from fpdf import FPDF

from app.models.cliente import Cliente
from app.models.ordem_servico import OrdemServico
from app.models.veiculo import Veiculo


def _moeda(valor: Decimal) -> str:
    return f"R$ {valor:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def gerar_pdf_orcamento(
    os_: OrdemServico,
    cliente: Cliente,
    veiculo: Veiculo,
    itens_peca: list[dict],
    valor_total: Decimal,
) -> bytes:
    """`itens_peca` é uma lista de dicts já com a descrição da peça
    resolvida (join feito no router): {descricao, quantidade,
    preco_unitario_venda, subtotal}."""

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, f"Orcamento - OS #{os_.numero}", ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Status: {os_.status}", ln=True)
    pdf.cell(0, 6, f"Data de abertura: {os_.data_abertura.strftime('%d/%m/%Y')}", ln=True)
    if os_.prazo_estimado:
        pdf.cell(0, 6, f"Prazo estimado: {os_.prazo_estimado.strftime('%d/%m/%Y')}", ln=True)
    if os_.forma_pagamento:
        pdf.cell(0, 6, f"Forma de pagamento: {os_.forma_pagamento}", ln=True)
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Cliente", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Nome: {cliente.nome}", ln=True)
    if cliente.telefone:
        pdf.cell(0, 6, f"Telefone: {cliente.telefone}", ln=True)
    if cliente.cpf_cnpj:
        pdf.cell(0, 6, f"CPF/CNPJ: {cliente.cpf_cnpj}", ln=True)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Veiculo", ln=True)
    pdf.set_font("Helvetica", "", 10)
    veic_linha = " ".join(filter(None, [veiculo.marca, veiculo.modelo, str(veiculo.ano or "")]))
    pdf.cell(0, 6, f"{veic_linha} - Placa {veiculo.placa}", ln=True)
    pdf.ln(4)

    if itens_peca:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Pecas", ln=True)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(90, 6, "Descricao", border="B")
        pdf.cell(25, 6, "Qtd.", border="B", align="R")
        pdf.cell(35, 6, "Preco unit.", border="B", align="R")
        pdf.cell(35, 6, "Subtotal", border="B", align="R", ln=True)
        pdf.set_font("Helvetica", "", 9)
        for item in itens_peca:
            pdf.cell(90, 6, str(item["descricao"])[:48])
            pdf.cell(25, 6, str(item["quantidade"]), align="R")
            pdf.cell(35, 6, _moeda(item["preco_unitario_venda"]), align="R")
            pdf.cell(35, 6, _moeda(item["subtotal"]), align="R", ln=True)
        pdf.ln(4)

    if os_.itens_servico:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Servicos", ln=True)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(150, 6, "Descricao", border="B")
        pdf.cell(35, 6, "Valor", border="B", align="R", ln=True)
        pdf.set_font("Helvetica", "", 9)
        for item in os_.itens_servico:
            pdf.cell(150, 6, str(item.descricao)[:80])
            pdf.cell(35, 6, _moeda(item.valor), align="R", ln=True)
        pdf.ln(4)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 10, f"Total: {_moeda(valor_total)}", ln=True)

    return bytes(pdf.output())
