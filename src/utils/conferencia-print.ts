import { ContagemSessao, ContagemItem } from "@/hooks/useSupabaseConferencia";

export interface PrintData {
  sessao: ContagemSessao;
  itens: ContagemItem[];
  lojaNome: string;
}

export function generateContagemPrintHTML(data: PrintData): string {
  const { sessao, itens, lojaNome } = data;
  const agora = new Date();
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Conferência de Estoque - Contagem Cega</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 12mm;
        }
        
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
          .page-break { page-break-before: always; }
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11pt;
          line-height: 1.2;
          color: #000;
          background: white;
          margin: 0;
          padding: 0;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }
        
        .logo-section {
          flex: 1;
        }
        
        .logo-placeholder {
          width: 120px;
          height: 40px;
          border: 1px solid #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10pt;
          color: #666;
        }
        
        .title-section {
          flex: 2;
          text-align: center;
        }
        
        .title-section h1 {
          margin: 0 0 5px 0;
          font-size: 18pt;
          font-weight: bold;
        }
        
        .subtitle {
          font-size: 12pt;
          color: #666;
          margin: 0;
        }
        
        .info-section {
          flex: 1;
          text-align: right;
          font-size: 10pt;
        }
        
        .info-section div {
          margin-bottom: 3px;
        }
        
        .session-info {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
          padding: 10px;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
        }
        
        .info-box strong {
          display: block;
          margin-bottom: 2px;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        .table th {
          background-color: #343a40;
          color: white;
          font-weight: bold;
          padding: 8px 6px;
          text-align: left;
          border: 1px solid #000;
          font-size: 10pt;
        }
        
        .table td {
          padding: 6px;
          border: 1px solid #666;
          vertical-align: top;
          font-size: 10pt;
        }
        
        .table tbody tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        
        .codigo {
          font-family: 'Courier New', monospace;
          font-weight: bold;
        }
        
        .tipo-badge {
          font-size: 8pt;
          padding: 2px 4px;
          background-color: #e9ecef;
          border-radius: 3px;
          display: inline-block;
          margin-top: 2px;
        }
        
        .qtd-input {
          border: none;
          border-bottom: 1px solid #000;
          text-align: center;
          width: 60px;
          padding: 2px;
          background: transparent;
        }
        
        .obs-input {
          border: none;
          border-bottom: 1px solid #000;
          width: 100%;
          padding: 2px;
          background: transparent;
          min-height: 20px;
        }
        
        .footer {
          position: fixed;
          bottom: 10mm;
          left: 12mm;
          right: 12mm;
          text-align: center;
          font-size: 9pt;
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 5px;
        }
        
        .instructions {
          margin-top: 15px;
          padding: 10px;
          background-color: #fff3cd;
          border: 1px solid #ffeeba;
          font-size: 10pt;
        }
        
        .instructions strong {
          color: #856404;
        }
        
        /* Colunas responsivas */
        .col-codigo { width: 12%; }
        .col-descricao { width: 35%; }
        .col-grupo { width: 20%; }
        .col-qtd { width: 15%; text-align: center; }
        .col-obs { width: 18%; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          <div class="logo-placeholder">LOGO</div>
        </div>
        <div class="title-section">
          <h1>Conferência de Estoque</h1>
          <p class="subtitle">Contagem Cega</p>
        </div>
        <div class="info-section">
          <div><strong>Data/Hora:</strong><br>${agora.toLocaleString('pt-BR')}</div>
          <div><strong>Loja:</strong><br>${lojaNome}</div>
          <div><strong>Sessão:</strong><br>${sessao.displayNo || sessao.id}</div>
        </div>
      </div>

      <div class="session-info">
        <div class="info-box">
          <strong>Responsável:</strong>
          ${sessao.criadaPor.nome}
        </div>
        <div class="info-box">
          <strong>Tipo de Contagem:</strong>
          ${sessao.filtros.tipo === 'AMBOS' ? 'Séries + Saldo' : sessao.filtros.tipo || 'Todos'}
        </div>
        <div class="info-box">
          <strong>Total de Itens:</strong>
          ${itens.length}
        </div>
      </div>

      ${sessao.observacao ? `
        <div style="margin-bottom: 15px; padding: 8px; background: #e7f3ff; border-left: 4px solid #0066cc;">
          <strong>Observação:</strong> ${sessao.observacao}
        </div>
      ` : ''}

      <table class="table">
        <thead>
          <tr>
            <th class="col-codigo">Código</th>
            <th class="col-descricao">Descrição</th>
            <th class="col-grupo">Grupo/Modelo</th>
            <th class="col-qtd">Qtd. Contada</th>
            <th class="col-obs">Observação</th>
          </tr>
        </thead>
        <tbody>
          ${itens.map((item, index) => `
            <tr>
              <td class="col-codigo">
                <span class="codigo">${item.codigo}</span>
                <div class="tipo-badge">${item.tipo === 'SERIE' ? 'Série' : 'Saldo'}</div>
              </td>
              <td class="col-descricao">
                <strong>${item.descricao}</strong>
              </td>
              <td class="col-grupo">
                ${item.grupoNome}<br>
                <em style="font-size: 9pt; color: #666;">${item.modeloNome}</em>
              </td>
              <td class="col-qtd">
                <input type="text" class="qtd-input" />
              </td>
              <td class="col-obs">
                <input type="text" class="obs-input" />
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="instructions">
        <strong>Instruções:</strong><br>
        • Preencha a quantidade contada fisicamente de cada item<br>
        • Use o campo "Observação" para anotar irregularidades ou detalhes importantes<br>
        • NÃO consulte o sistema durante a contagem (contagem cega)<br>
        • Após finalizar, digite os dados no sistema para comparação automática
      </div>

      <div class="footer">
        <div>
          Documento não fiscal - Uso interno para controle de estoque | 
          Gerado em ${agora.toLocaleString('pt-BR')} | 
          Página 1
        </div>
      </div>

      <!-- Botões de ação (não imprimem) -->
      <div class="no-print" style="position: fixed; top: 10px; right: 10px; background: white; padding: 10px; border: 1px solid #ccc; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <button onclick="window.print()" style="margin-right: 10px; padding: 8px 15px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
          🖨️ Imprimir
        </button>
        <button onclick="window.close()" style="padding: 8px 15px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">
          ✖️ Fechar
        </button>
      </div>
    </body>
    </html>
  `;
}

export function printContagemCega(data: PrintData): void {
  const htmlContent = generateContagemPrintHTML(data);
  
  // Abrir nova janela para impressão
  const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');
  
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Aguardar o carregamento e focar na janela
    printWindow.onload = () => {
      printWindow.focus();
    };
  } else {
    // Fallback se popup foi bloqueado
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contagem-cega-${data.sessao.displayNo || data.sessao.id}-${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

export function generateContagemPDF(data: PrintData): void {
  // Para implementação futura com jsPDF
  // Por enquanto, usar a função de print HTML
  printContagemCega(data);
}