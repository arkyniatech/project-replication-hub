/**
 * Folha de contagem cega do almoxarifado.
 *
 * Adaptado de src/utils/conferencia-print.ts (removido no commit c984332),
 * que fazia o mesmo para o inventário de equipamentos.
 *
 * A folha NÃO imprime o saldo do sistema — é o que torna a contagem cega.
 * As colunas de quantidade e observação saem em branco, com linha para
 * escrita à mão.
 *
 * window.open + HTML em vez de html2canvas/react-to-print: o texto sai real
 * (não vira imagem), a paginação é a do navegador via @page, e não é preciso
 * montar centenas de linhas escondidas no DOM só para imprimir.
 */

export interface FolhaContagemItem {
  sku: string | null;
  descricao: string;
  unidade: string;
  grupo: string | null;
}

export interface FolhaContagemData {
  numero: string;
  lojaNome: string;
  tipo: string;
  grupo?: string | null;
  responsavel: string;
  itens: FolhaContagemItem[];
}

const escaparHtml = (valor: string | null | undefined): string =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function gerarFolhaContagemHTML(data: FolhaContagemData): string {
  const { numero, lojaNome, tipo, grupo, responsavel, itens } = data;
  const agora = new Date();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contagem Cega ${escaparHtml(numero)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt; line-height: 1.2; color: #000; background: #fff; margin: 0; padding: 0;
    }
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 12px;
    }
    .title-section h1 { margin: 0 0 4px; font-size: 18pt; }
    .subtitle { font-size: 12pt; color: #555; margin: 0; }
    .info-section { text-align: right; font-size: 10pt; }
    .info-section div { margin-bottom: 3px; }
    .session-info {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
      margin-bottom: 16px; padding: 10px; background: #f6f7f8; border: 1px solid #dee2e6;
      font-size: 10pt;
    }
    .info-box strong { display: block; margin-bottom: 2px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .table th {
      background: #343a40; color: #fff; font-weight: bold; padding: 8px 6px;
      text-align: left; border: 1px solid #000; font-size: 10pt;
    }
    .table td { padding: 7px 6px; border: 1px solid #666; vertical-align: top; font-size: 10pt; }
    .table tbody tr:nth-child(even) { background: #f8f9fa; }
    .codigo { font-family: 'Courier New', monospace; font-weight: bold; }
    /* campos manuscritos: linha para escrever, sem valor pré-impresso */
    .campo-escrita { border-bottom: 1px solid #000; min-height: 18px; }
    .col-codigo { width: 13%; }
    .col-descricao { width: 37%; }
    .col-grupo { width: 16%; }
    .col-un { width: 7%; text-align: center; }
    .col-qtd { width: 12%; }
    .col-obs { width: 15%; }
    .instructions {
      margin-top: 12px; padding: 10px; background: #fff3cd; border: 1px solid #ffeeba; font-size: 10pt;
    }
    .instructions strong { color: #856404; }
    .assinatura { margin-top: 26px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; font-size: 10pt; }
    .assinatura div { border-top: 1px solid #000; padding-top: 4px; text-align: center; }
    .footer { margin-top: 18px; text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 5px; }
    .toolbar {
      position: fixed; top: 10px; right: 10px; background: #fff; padding: 10px;
      border: 1px solid #ccc; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,.1);
    }
    .toolbar button { padding: 8px 15px; border: none; border-radius: 3px; cursor: pointer; font-size: 11pt; }
    .btn-print { background: #0e6b63; color: #fff; margin-right: 8px; }
    .btn-close { background: #6c757d; color: #fff; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-section">
      <h1>Contagem Cega — Almoxarifado</h1>
      <p class="subtitle">Folha de contagem física</p>
    </div>
    <div class="info-section">
      <div><strong>Contagem:</strong> ${escaparHtml(numero)}</div>
      <div><strong>Loja:</strong> ${escaparHtml(lojaNome)}</div>
      <div><strong>Emitida em:</strong> ${agora.toLocaleString('pt-BR')}</div>
    </div>
  </div>

  <div class="session-info">
    <div class="info-box"><strong>Responsável</strong>${escaparHtml(responsavel)}</div>
    <div class="info-box"><strong>Tipo</strong>${escaparHtml(tipo)}</div>
    <div class="info-box"><strong>Grupo</strong>${escaparHtml(grupo || 'Todos')}</div>
    <div class="info-box"><strong>Total de itens</strong>${itens.length}</div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th class="col-codigo">SKU</th>
        <th class="col-descricao">Descrição</th>
        <th class="col-grupo">Grupo</th>
        <th class="col-un">Un.</th>
        <th class="col-qtd">Qtd. contada</th>
        <th class="col-obs">Observação</th>
      </tr>
    </thead>
    <tbody>
      ${itens.map(item => `
      <tr>
        <td class="col-codigo"><span class="codigo">${escaparHtml(item.sku) || '—'}</span></td>
        <td class="col-descricao">${escaparHtml(item.descricao)}</td>
        <td class="col-grupo">${escaparHtml(item.grupo) || '—'}</td>
        <td class="col-un">${escaparHtml(item.unidade)}</td>
        <td class="col-qtd"><div class="campo-escrita"></div></td>
        <td class="col-obs"><div class="campo-escrita"></div></td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="instructions">
    <strong>Instruções:</strong><br>
    • Preencha a quantidade contada fisicamente de cada item<br>
    • Use "Observação" para anotar irregularidades (avaria, item fora do lugar, embalagem violada)<br>
    • NÃO consulte o sistema durante a contagem — esta é uma contagem cega<br>
    • Ao terminar, digite os valores no sistema para a comparação automática
  </div>

  <div class="assinatura">
    <div>Responsável pela contagem</div>
    <div>Conferido por</div>
  </div>

  <div class="footer">
    Documento não fiscal — uso interno | Contagem ${escaparHtml(numero)} | ${escaparHtml(lojaNome)}
  </div>

  <div class="toolbar no-print">
    <button class="btn-print" onclick="window.print()">Imprimir</button>
    <button class="btn-close" onclick="window.close()">Fechar</button>
  </div>
</body>
</html>`;
}

export function imprimirFolhaContagem(data: FolhaContagemData): void {
  const html = gerarFolhaContagemHTML(data);
  const janela = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');

  if (janela) {
    janela.document.write(html);
    janela.document.close();
    // document.close() já dispara o load; registrar onload depois disso pode
    // nunca executar, então o foco é pedido direto.
    janela.focus();
    return;
  }

  // popup bloqueado: entrega como arquivo para o usuário abrir e imprimir
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `contagem-${data.numero}-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // o download é assíncrono: revogar na hora entrega um arquivo vazio
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
