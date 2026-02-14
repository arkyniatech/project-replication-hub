import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface FaturaPDF {
  numero: string;
  emissao: string;
  cliente: string;
  contrato: string;
  tipo: string;
  forma: string;
  total: number;
}

interface FiltrosPDF {
  periodo?: { inicio: string; fim: string };
  loja: string;
  totalFaturas: number;
  totalValor: number;
}

export async function gerarPDFRelatorioFaturas(
  faturas: FaturaPDF[],
  filtros: FiltrosPDF
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Cabeçalho
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE FATURAS', 148, 20, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  let yPos = 30;
  
  if (filtros.periodo) {
    doc.text(
      `Período: ${format(new Date(filtros.periodo.inicio), 'dd/MM/yyyy')} a ${format(new Date(filtros.periodo.fim), 'dd/MM/yyyy')}`,
      148,
      yPos,
      { align: 'center' }
    );
    yPos += 6;
  }
  
  doc.text(`Unidade: ${filtros.loja}`, 148, yPos, { align: 'center' });
  yPos += 10;

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, 277, yPos);
  yPos += 8;

  // Totalizadores
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Total de Faturas: ${filtros.totalFaturas}`,
    20,
    yPos
  );
  doc.text(
    `Valor Total: R$ ${filtros.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    200,
    yPos,
    { align: 'right' }
  );
  yPos += 10;

  // Tabela
  autoTable(doc, {
    startY: yPos,
    head: [['Nº Fatura', 'Emissão', 'Cliente', 'Contrato', 'Tipo', 'Forma', 'Total (R$)']],
    body: faturas.map((f) => [
      f.numero,
      format(new Date(f.emissao), 'dd/MM/yyyy'),
      f.cliente,
      f.contrato,
      f.tipo,
      f.forma,
      f.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [249, 115, 22], // orange-500 (primária)
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // gray-50
    },
    columnStyles: {
      6: { halign: 'right' }, // Total alinhado à direita
    },
    margin: { left: 20, right: 20 },
    didDrawPage: (data) => {
      // Rodapé
      const pageCount = (doc as any).internal.getNumberOfPages();
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      
      const footerText = `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Usuário: Admin | Página ${pageNumber} de ${pageCount}`;
      doc.text(footerText, 148, 200, { align: 'center' });
    },
  });

  // Salvar PDF
  const nomeArquivo = `faturas_${format(new Date(), 'yyyy-MM-dd')}_${filtros.loja.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  doc.save(nomeArquivo);
}
