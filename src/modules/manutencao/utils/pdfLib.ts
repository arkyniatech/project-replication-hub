import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { OSOficina, EquipOficina } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { APP_CONFIG } from '@/config/app';

export class PDFLib {
  private static addHeader(doc: jsPDF, title: string) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${APP_CONFIG.company.name} - Sistema de Manutenção`, 20, 35);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 20, 42);
    
    doc.setDrawColor(240, 240, 240);
    doc.line(20, 50, 190, 50);
  }

  private static addFooter(doc: jsPDF, pageNumber: number) {
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setDrawColor(240, 240, 240);
    doc.line(20, pageHeight - 25, 190, pageHeight - 25);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${pageNumber}`, 20, pageHeight - 15);
    doc.text(`Usuário: admin | Data: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 190, pageHeight - 15, { align: 'right' });
  }

  static async gerarOS(os: OSOficina, equipamento: EquipOficina): Promise<void> {
    const doc = new jsPDF();
    
    this.addHeader(doc, `Ordem de Serviço ${os.id}`);
    
    let yPos = 65;
    
    // Equipment Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Informações do Equipamento', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Código: ${equipamento.codigo}`, 20, yPos);
    doc.text(`Modelo: ${equipamento.modelo}`, 100, yPos);
    yPos += 7;
    doc.text(`Série: ${equipamento.serie}`, 20, yPos);
    doc.text(`Loja: ${equipamento.loja}`, 100, yPos);
    yPos += 15;
    
    // OS Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes da OS', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo: ${os.tipo}`, 20, yPos);
    doc.text(`Prioridade: ${os.prioridade}`, 100, yPos);
    yPos += 7;
    doc.text(`Status: ${os.status}`, 20, yPos);
    doc.text(`Área Atual: ${os.areaAtual}`, 100, yPos);
    yPos += 7;
    doc.text(`SLA: ${os.SLA_horas} horas`, 20, yPos);
    yPos += 15;
    
    // Laudo
    if (os.laudoHtml) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Laudo Técnico', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      // Simple text extraction from HTML
      const laudoText = os.laudoHtml.replace(/<[^>]*>/g, '');
      const lines = doc.splitTextToSize(laudoText, 170);
      for (const line of lines) {
        doc.text(line, 20, yPos);
        yPos += 5;
      }
      yPos += 10;
    }
    
    // Timeline resumida
    if (os.timeline.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Timeline (Resumida)', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      // Show last 5 events
      const recentEvents = os.timeline.slice(-5);
      for (const evento of recentEvents) {
        const data = format(new Date(evento.ts), "dd/MM HH:mm", { locale: ptBR });
        doc.text(`${data} - ${evento.action} (${evento.user})`, 20, yPos);
        yPos += 5;
        
        if (yPos > 250) break; // Avoid overflow
      }
    }
    
    this.addFooter(doc, 1);
    
    doc.save(`OS-${os.id}.pdf`);
  }

  static async gerarLiberacao(os: OSOficina, equipamento: EquipOficina): Promise<void> {
    const doc = new jsPDF();
    
    this.addHeader(doc, `Certificado de Liberação - ${equipamento.codigo}`);
    
    let yPos = 65;
    
    // Carimbo APTO
    doc.setFillColor(34, 197, 94); // green-500
    doc.rect(130, 60, 50, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('APTO PARA', 135, 68, { align: 'left' });
    doc.text('LOCAÇÃO', 135, 76, { align: 'left' });
    
    doc.setTextColor(0, 0, 0);
    yPos += 35;
    
    // Equipment Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipamento Liberado', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Código: ${equipamento.codigo}`, 20, yPos);
    yPos += 7;
    doc.text(`Modelo: ${equipamento.modelo}`, 20, yPos);
    yPos += 7;
    doc.text(`Série: ${equipamento.serie}`, 20, yPos);
    yPos += 15;
    
    // Checklist resumo
    if (os.checklist) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo do Checklist', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const itensCriticos = os.checklist.itens.filter(item => item.critico);
      const criticosOk = itensCriticos.every(item => item.ok);
      
      doc.text(`Itens Críticos: ${criticosOk ? 'APROVADOS' : 'REPROVADOS'}`, 20, yPos);
      yPos += 7;
      doc.text(`Teste Mínimo: ${os.checklist.testeMinOk ? 'APROVADO' : 'REPROVADO'}`, 20, yPos);
      yPos += 7;
      doc.text(`Resultado: ${os.checklist.resultado}`, 20, yPos);
      yPos += 15;
      
      // Assinatura
      doc.text('Mecânico Responsável:', 20, yPos);
      yPos += 7;
      doc.text(os.checklist.assinaturaMecanico || 'Não informado', 20, yPos);
      yPos += 7;
      doc.text(`Data: ${format(new Date(os.checklist.dtFim), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 20, yPos);
    }
    
    this.addFooter(doc, 1);
    
    doc.save(`Liberacao-${equipamento.codigo}.pdf`);
  }

  static async gerarPecasReaproveitaveis(os: OSOficina, pecasReaproveitaveis: Array<{item: string; condicao: string; observacao?: string}>): Promise<void> {
    const doc = new jsPDF();
    
    this.addHeader(doc, `Peças Reaproveitáveis - OS ${os.id}`);
    
    let yPos = 65;
    
    // Info da OS
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Informações da Baixa', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`OS: ${os.id}`, 20, yPos);
    doc.text(`Equipamento: ${os.equipamentoId}`, 100, yPos);
    yPos += 7;
    doc.text(`Data da Baixa: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`, 20, yPos);
    yPos += 15;
    
    // Lista de peças
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Peças Reaproveitáveis', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (pecasReaproveitaveis.length === 0) {
      doc.text('Nenhuma peça identificada como reaproveitável', 20, yPos);
    } else {
      pecasReaproveitaveis.forEach((peca, index) => {
        doc.text(`${index + 1}. ${peca.item}`, 20, yPos);
        yPos += 5;
        doc.text(`   Condição: ${peca.condicao}`, 25, yPos);
        yPos += 5;
        if (peca.observacao) {
          doc.text(`   Obs: ${peca.observacao}`, 25, yPos);
          yPos += 5;
        }
        yPos += 3;
      });
    }
    
    yPos += 20;
    
    // Aprovação
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Aprovação', 20, yPos);
    yPos += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Gestor Responsável: _____________________________', 20, yPos);
    yPos += 15;
    doc.text('Data: ___/___/______  Assinatura: _____________________________', 20, yPos);
    
    this.addFooter(doc, 1);
    
    doc.save(`PecasReaproveitaveis-OS${os.id}.pdf`);
  }

  // Método utilitário para capturar elemento HTML e gerar PDF
  static async capturarElemento(elementId: string, filename: string): Promise<void> {
    const elemento = document.getElementById(elementId);
    if (!elemento) {
      throw new Error(`Elemento com ID '${elementId}' não encontrado`);
    }
    
    try {
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(filename);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw error;
    }
  }
}

export default PDFLib;