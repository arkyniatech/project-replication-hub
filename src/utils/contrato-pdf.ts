import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { APP_CONFIG } from '@/config/app';

interface ContratoPDFData {
  numero?: string;
  cliente: {
    nomeRazao: string;
    documento: string;
    endereco?: any;
  };
  itens: Array<{
    equipamento: {
      nome: string;
      codigo: string;
    };
    quantidade: number;
    periodoEscolhido: string;
    valorUnitario: number;
    subtotal: number;
  }>;
  entrega: {
    data: string;
    janela: string;
    observacoes?: string;
  };
  pagamento: {
    forma: string;
    vencimentoISO: string;
  };
  valorTotal: number;
}

// Paleta institucional
const COLOR_PRIMARY: [number, number, number] = [30, 58, 95];     // azul escuro
const COLOR_ACCENT: [number, number, number]  = [217, 119, 6];    // âmbar
const COLOR_HEADER_BG: [number, number, number] = [30, 58, 95];
const COLOR_HEADER_TEXT: [number, number, number] = [255, 255, 255];
const COLOR_ZEBRA: [number, number, number] = [245, 247, 250];
const COLOR_FOOT_BG: [number, number, number] = [217, 119, 6];
const COLOR_FOOT_TEXT: [number, number, number] = [255, 255, 255];
const COLOR_MUTED: [number, number, number] = [100, 116, 139];

const formatarPeriodo = (periodo: string) => {
  const periodos: Record<string, string> = {
    'DIARIA': 'Diária',
    'SEMANA': 'Semanal',
    'QUINZENA': 'Quinzenal',
    '21DIAS': '21 Dias',
    'MES': 'Mensal'
  };
  return periodos[periodo] || periodo;
};

const formatarForma = (forma: string) => {
  const formas: Record<string, string> = {
    'BOLETO': 'Boleto Bancário',
    'PIX': 'PIX',
    'CARTAO': 'Cartão',
    'CARTAO_DEBITO': 'Cartão de Débito',
    'CARTAO_CREDITO': 'Cartão de Crédito',
    'DINHEIRO': 'Dinheiro'
  };
  return formas[forma] || forma;
};

const formatarMoeda = (valor: number) =>
  `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const formatarData = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
};

// Renderiza um título de seção com barra colorida à esquerda
function sectionTitle(doc: jsPDF, text: string, x: number, y: number, pageWidth: number, margin: number) {
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(x, y - 4, 3, 6, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text(text, x + 6, y);
  doc.setDrawColor(220, 225, 232);
  doc.setLineWidth(0.3);
  doc.line(x + 6 + doc.getTextWidth(text) + 4, y - 1, pageWidth - margin, y - 1);
  doc.setTextColor(0, 0, 0);
}

export function gerarContratoPDF(contrato: ContratoPDFData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  let y = 14;

  // --- Faixa de cabeçalho ---
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_HEADER_TEXT);
  doc.text(APP_CONFIG.company.fullName, margin, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`CNPJ: ${APP_CONFIG.company.cnpj}  •  IE: ${APP_CONFIG.company.ie}`, margin, 16);
  doc.text(
    `${APP_CONFIG.company.address.street} - ${APP_CONFIG.company.address.district}, ${APP_CONFIG.company.address.city}/${APP_CONFIG.company.address.state}`,
    margin, 20
  );
  doc.text(`WhatsApp: ${APP_CONFIG.company.contact.phone}`, margin, 24);

  // Badge contrato
  doc.setFillColor(...COLOR_ACCENT);
  const badgeW = 56;
  doc.roundedRect(pageWidth - margin - badgeW, 6, badgeW, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO', pageWidth - margin - badgeW + 4, 11);
  doc.setFontSize(11);
  doc.text(contrato.numero ? `Nº ${contrato.numero}` : 'LOCAÇÃO', pageWidth - margin - badgeW + 4, 17);

  doc.setTextColor(0, 0, 0);
  y = 36;

  // --- Título do documento ---
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('CONTRATO DE LOCAÇÃO DE EQUIPAMENTOS', pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 8;

  // --- Dados do Cliente ---
  sectionTitle(doc, 'DADOS DO LOCATÁRIO', margin, y, pageWidth, margin);
  y += 5;

  doc.setFillColor(...COLOR_ZEBRA);
  const clienteBoxH = contrato.cliente.endereco ? 22 : 16;
  doc.roundedRect(margin, y, pageWidth - 2 * margin, clienteBoxH, 1.5, 1.5, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Nome/Razão Social: `, margin + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(contrato.cliente.nomeRazao, margin + 38, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.text(`Documento: `, margin + 4, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(contrato.cliente.documento, margin + 26, y + 12);

  if (contrato.cliente.endereco) {
    const end = contrato.cliente.endereco;
    const endStr = [end.logradouro, end.numero, end.bairro, end.cidade ? `${end.cidade}/${end.uf}` : '']
      .filter(Boolean).join(', ');
    if (endStr) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Endereço: `, margin + 4, y + 18);
      doc.setFont('helvetica', 'bold');
      doc.text(endStr, margin + 22, y + 18, { maxWidth: pageWidth - 2 * margin - 26 });
    }
  }
  y += clienteBoxH + 8;

  // --- Entrega ---
  sectionTitle(doc, 'ENTREGA', margin, y, pageWidth, margin);
  y += 5;

  doc.setFillColor(...COLOR_ZEBRA);
  const entregaBoxH = contrato.entrega.observacoes ? 18 : 12;
  doc.roundedRect(margin, y, pageWidth - 2 * margin, entregaBoxH, 1.5, 1.5, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Data:', margin + 4, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(formatarData(contrato.entrega.data), margin + 16, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.text('Período:', margin + 70, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(contrato.entrega.janela === 'MANHA' ? 'Manhã' : 'Tarde', margin + 86, y + 7);

  if (contrato.entrega.observacoes) {
    doc.setFont('helvetica', 'normal');
    doc.text('Obs:', margin + 4, y + 14);
    doc.setFont('helvetica', 'bold');
    doc.text(contrato.entrega.observacoes, margin + 14, y + 14, { maxWidth: pageWidth - 2 * margin - 18 });
  }
  y += entregaBoxH + 8;

  // --- Tabela de Equipamentos ---
  sectionTitle(doc, 'EQUIPAMENTOS LOCADOS', margin, y, pageWidth, margin);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Equipamento', 'Código', 'Qtd', 'Período', 'Valor Unit.', 'Subtotal']],
    body: contrato.itens.map(item => [
      item.equipamento.nome,
      item.equipamento.codigo,
      String(item.quantidade),
      formatarPeriodo(item.periodoEscolhido),
      formatarMoeda(item.valorUnitario),
      formatarMoeda(item.subtotal),
    ]),
    foot: [['', '', '', '', 'Total Geral:', formatarMoeda(contrato.valorTotal)]],
    styles: { fontSize: 9, cellPadding: 3, lineColor: [220, 225, 232], lineWidth: 0.2 },
    headStyles: {
      fillColor: COLOR_HEADER_BG,
      textColor: COLOR_HEADER_TEXT,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: { textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: COLOR_ZEBRA },
    footStyles: {
      fillColor: COLOR_FOOT_BG,
      textColor: COLOR_FOOT_TEXT,
      fontStyle: 'bold',
      halign: 'right',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center' },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
    theme: 'grid',
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // --- Condições de Pagamento ---
  if (y > pageHeight - 70) { doc.addPage(); y = 20; }

  sectionTitle(doc, 'CONDIÇÕES DE PAGAMENTO', margin, y, pageWidth, margin);
  y += 5;

  doc.setFillColor(...COLOR_ZEBRA);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 1.5, 1.5, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Forma:', margin + 4, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(formatarForma(contrato.pagamento.forma), margin + 18, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.text('Vencimento:', margin + 90, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(formatarData(contrato.pagamento.vencimentoISO), margin + 114, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.text('Valor Total:', margin + 4, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_ACCENT);
  doc.text(formatarMoeda(contrato.valorTotal), margin + 24, y + 14);
  doc.setTextColor(0, 0, 0);

  y += 26;

  // --- Assinaturas ---
  if (y > pageHeight - 50) { doc.addPage(); y = 20; }

  const colWidth = (pageWidth - 2 * margin) / 2 - 10;
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + colWidth, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('LOCADORA', margin + colWidth / 2, y + 5, { align: 'center' });
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(APP_CONFIG.company.fullName, margin + colWidth / 2, y + 10, { align: 'center' });

  const col2X = pageWidth - margin - colWidth;
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.line(col2X, y, pageWidth - margin, y);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text('LOCATÁRIO', col2X + colWidth / 2, y + 5, { align: 'center' });
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(contrato.cliente.nomeRazao, col2X + colWidth / 2, y + 10, { align: 'center' });

  // --- Rodapé em todas as páginas ---
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 225, 232);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      margin, pageHeight - 7
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);

  return doc;
}

export function gerarContratoPDFBase64(contrato: ContratoPDFData): string {
  const doc = gerarContratoPDF(contrato);
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1];
}

export function downloadContratoPDF(contrato: ContratoPDFData, filename?: string) {
  const doc = gerarContratoPDF(contrato);
  doc.save(filename || `contrato-${Date.now()}.pdf`);
}
