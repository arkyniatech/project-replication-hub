import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Divergencia, ContagemSessao } from '@/hooks/useSupabaseConferencia';
import { ACOES_LABELS, STATUS_LABELS } from '@/config/inventario';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportData {
  sessao: ContagemSessao;
  divergencias: Divergencia[];
  lojaNome: string;
  filtros?: {
    loja?: string;
    grupo?: string;
    modelo?: string;
    acao?: string;
    status?: string;
  };
}

export function exportContagemCSV(data: ExportData): void {
  const { divergencias, sessao, lojaNome } = data;
  
  // Cabeçalhos conforme especificação E-5
  const headers = [
    'Sessão',
    'Loja',
    'Código', 
    'Descrição',
    'Sistema',
    'Contado',
    'Δ',
    'Δ%',
    'Ação',
    'Justificativa',
    'Status',
    'Aprovador',
    'Data'
  ];
  
  const rows = divergencias.map(div => [
    sessao.displayNo || sessao.id,
    lojaNome,
    div.codigo,
    div.descricao,
    div.qtdSistema.toString(),
    div.qtdContada.toString(),
    div.delta.toString(),
    `${div.perc.toFixed(1)}%`,
    div.acao ? ACOES_LABELS[div.acao] : '',
    div.justificativa || '',
    STATUS_LABELS[div.status],
    div.aprovacao?.aprovadoPor?.nome || '',
    div.aprovacao?.aprovadoEm ? format(new Date(div.aprovacao.aprovadoEm), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : ''
  ]);

  // Criar CSV com BOM UTF-8 e separador ";"
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(';'))
    .join('\n');

  // Adicionar BOM para UTF-8
  const blob = new Blob(['\uFEFF' + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  
  // Nome do arquivo usando displayNo se disponível
  const sessionId = sessao.displayNo || sessao.id;
  const fileNameSafe = sessionId.replace(/[^a-zA-Z0-9-_]/g, '_');
  link.download = `contagem_${fileNameSafe}.csv`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(link.href);
}

export async function exportContagemPDF(data: ExportData): Promise<void> {
  const { divergencias, sessao, lojaNome, filtros } = data;
  
  // Criar PDF A4
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 12; // 12mm conforme especificação
  const usableWidth = pageWidth - (2 * margin);
  
  let currentY = margin;

  // Função para adicionar nova página se necessário
  const checkPageBreak = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      addHeader(); // Repetir cabeçalho
    }
  };

  // Função para adicionar cabeçalho
  const addHeader = () => {
    // Logo/Marca (mock)
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ERP LocaAção', margin, currentY);
    
    // Título do relatório
    currentY += 10;
    pdf.setFontSize(14);
    pdf.text('Relatório de Contagem Cega - Divergências', margin, currentY);
    
    // Informações da sessão
    currentY += 8;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    const infoLines = [
      `Sessão: ${sessao.displayNo || sessao.id}`,
      `Loja: ${lojaNome}`,
      `Data: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      `Status: ${sessao.status}`
    ];
    
    infoLines.forEach(line => {
      pdf.text(line, margin, currentY);
      currentY += 5;
    });

    // Filtros aplicados (se houver)
    if (filtros && Object.values(filtros).some(v => v)) {
      currentY += 3;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Filtros aplicados:', margin, currentY);
      currentY += 5;
      
      pdf.setFont('helvetica', 'normal');
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) {
          pdf.text(`• ${key}: ${value}`, margin + 5, currentY);
          currentY += 4;
        }
      });
    }
    
    currentY += 8;
  };

  // Função para adicionar rodapé
  const addFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 8;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    // Data/hora/usuário no canto esquerdo
    const footerLeft = `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })} por Demo User`;
    pdf.text(footerLeft, margin, footerY);
    
    // Página no canto direito
    const footerRight = `Página ${pageNum} de ${totalPages}`;
    const footerRightWidth = pdf.getTextWidth(footerRight);
    pdf.text(footerRight, pageWidth - margin - footerRightWidth, footerY);
  };

  // Adicionar cabeçalho inicial
  addHeader();

  // Resumo estatístico
  const totalItens = divergencias.length;
  const comDivergencia = divergencias.filter(d => d.delta !== 0).length;
  const positivos = divergencias.filter(d => d.delta > 0).length;
  const negativos = divergencias.filter(d => d.delta < 0).length;
  
  checkPageBreak(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Resumo:', margin, currentY);
  currentY += 6;
  
  pdf.setFont('helvetica', 'normal');
  const resumoLines = [
    `Total de itens: ${totalItens}`,
    `Com divergência: ${comDivergencia}`,
    `Ajustes positivos: ${positivos}`,
    `Ajustes negativos: ${negativos}`
  ];
  
  resumoLines.forEach(line => {
    pdf.text(line, margin + 5, currentY);
    currentY += 5;
  });
  
  currentY += 8;

  // Tabela de divergências
  checkPageBreak(30);
  
  const tableHeaders = [
    'Código', 'Descrição', 'Sistema', 'Contado', 'Δ', 'Δ%', 'Ação', 'Status'
  ];
  
  const tableData = divergencias.map(div => [
    div.codigo,
    div.descricao.length > 30 ? div.descricao.substring(0, 27) + '...' : div.descricao,
    div.qtdSistema.toString(),
    div.qtdContada.toString(),
    div.delta.toString(),
    `${div.perc.toFixed(1)}%`,
    div.acao ? ACOES_LABELS[div.acao].substring(0, 15) : '',
    STATUS_LABELS[div.status].substring(0, 12)
  ]);

  pdf.autoTable({
    startY: currentY,
    head: [tableHeaders],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [245, 147, 22], // Cor primária laranja
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 'auto' }, // Código
      1: { cellWidth: 'auto' }, // Descrição
      2: { cellWidth: 15 },     // Sistema
      3: { cellWidth: 15 },     // Contado
      4: { cellWidth: 12 },     // Δ
      5: { cellWidth: 15 },     // Δ%
      6: { cellWidth: 'auto' }, // Ação
      7: { cellWidth: 'auto' }  // Status
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    didDrawPage: (data) => {
      // Não adicionar rodapé aqui, será feito depois
    }
  });

  // Obter número total de páginas
  const totalPages = pdf.internal.pages.length - 1;
  
  // Adicionar rodapé em todas as páginas
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(i, totalPages);
  }

  // Salvar PDF
  const sessionId = sessao.displayNo || sessao.id;
  const fileNameSafe = sessionId.replace(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = `contagem_${fileNameSafe}.pdf`;
  pdf.save(fileName);
}

export async function printContagemResumo(elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Elemento não encontrado para impressão');
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 10;
    
    const imgWidth = pageWidth - (2 * margin);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Se a imagem for muito alta, dividir em páginas
    if (imgHeight > pageHeight - (2 * margin)) {
      const pagesNeeded = Math.ceil(imgHeight / (pageHeight - (2 * margin)));
      const pageImgHeight = (pageHeight - (2 * margin));
      
      for (let i = 0; i < pagesNeeded; i++) {
        if (i > 0) pdf.addPage();
        
        const srcY = (i * pageImgHeight * canvas.height) / imgHeight;
        const srcHeight = Math.min(pageImgHeight * canvas.height / imgHeight, canvas.height - srcY);
        
        // Criar canvas para esta página
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcHeight;
        
        const pageCtx = pageCanvas.getContext('2d');
        if (pageCtx) {
          pageCtx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, canvas.width, srcHeight);
          const pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageImgHeight);
        }
      }
    } else {
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    }

    pdf.save(`contagem_resumo_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error('Erro ao gerar PDF. Tente novamente.');
  }
}