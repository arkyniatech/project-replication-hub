import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { APP_CONFIG } from '@/config/app';

interface ContratoPDFData {
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
    'DINHEIRO': 'Dinheiro'
  };
  return formas[forma] || forma;
};

const formatarMoeda = (valor: number) =>
  `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR');

export function gerarContratoPDF(contrato: ContratoPDFData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 15;
  let y = 20;

  // --- Cabeçalho Empresa ---
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(APP_CONFIG.company.fullName, pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `CNPJ: ${APP_CONFIG.company.cnpj} • IE: ${APP_CONFIG.company.ie}`,
    pageWidth / 2, y, { align: 'center' }
  );
  y += 5;
  doc.text(
    `${APP_CONFIG.company.address.street} - ${APP_CONFIG.company.address.district}, ${APP_CONFIG.company.address.city}/${APP_CONFIG.company.address.state} • WhatsApp: ${APP_CONFIG.company.contact.phone}`,
    pageWidth / 2, y, { align: 'center' }
  );
  y += 3;

  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- Título ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE LOCAÇÃO DE EQUIPAMENTOS', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // --- Dados do Cliente ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome/Razão Social: ${contrato.cliente.nomeRazao}`, margin, y);
  y += 5;
  doc.text(`Documento: ${contrato.cliente.documento}`, margin, y);
  y += 5;

  if (contrato.cliente.endereco) {
    const end = contrato.cliente.endereco;
    const endStr = [end.logradouro, end.numero, end.bairro, end.cidade ? `${end.cidade}/${end.uf}` : '']
      .filter(Boolean).join(', ');
    if (endStr) {
      doc.text(`Endereço: ${endStr}`, margin, y);
      y += 5;
    }
  }
  y += 3;

  // --- Entrega ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ENTREGA', margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${formatarData(contrato.entrega.data)}`, margin, y);
  y += 5;
  doc.text(`Período: ${contrato.entrega.janela === 'MANHA' ? 'Manhã' : 'Tarde'}`, margin, y);
  y += 5;

  if (contrato.entrega.observacoes) {
    doc.text(`Obs: ${contrato.entrega.observacoes}`, margin, y);
    y += 5;
  }
  y += 3;

  // --- Tabela de Equipamentos ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('EQUIPAMENTOS LOCADOS', margin, y);
  y += 2;

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
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [230, 240, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
    theme: 'grid',
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // --- Condições de Pagamento ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDIÇÕES DE PAGAMENTO', margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Forma de Pagamento: ${formatarForma(contrato.pagamento.forma)}`, margin, y);
  y += 5;
  doc.text(`Vencimento: ${formatarData(contrato.pagamento.vencimentoISO)}`, margin, y);
  y += 15;

  // --- Assinaturas ---
  const colWidth = (pageWidth - 2 * margin) / 2 - 10;

  doc.line(margin, y, margin + colWidth, y);
  doc.text('LOCADORA', margin + colWidth / 2, y + 5, { align: 'center' });
  doc.text(APP_CONFIG.company.fullName, margin + colWidth / 2, y + 10, { align: 'center' });

  const col2X = pageWidth - margin - colWidth;
  doc.line(col2X, y, pageWidth - margin, y);
  doc.text('LOCATÁRIO', col2X + colWidth / 2, y + 5, { align: 'center' });
  doc.text(contrato.cliente.nomeRazao, col2X + colWidth / 2, y + 10, { align: 'center' });

  y += 20;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
    pageWidth / 2, y, { align: 'center' }
  );

  return doc;
}

export function gerarContratoPDFBase64(contrato: ContratoPDFData): string {
  const doc = gerarContratoPDF(contrato);
  // Returns base64 without the data:application/pdf;base64, prefix
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1];
}

export function downloadContratoPDF(contrato: ContratoPDFData, filename?: string) {
  const doc = gerarContratoPDF(contrato);
  doc.save(filename || `contrato-${Date.now()}.pdf`);
}
