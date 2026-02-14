import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTransferenciasStore } from "@/stores/transferenciasStore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface DespachoPDFProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferenciaId: string | null;
}

export function DespachoPDF({ open, onOpenChange, transferenciaId }: DespachoPDFProps) {
  const { transferencias } = useTransferenciasStore();
  const [loading, setLoading] = useState(false);
  
  const transferencia = transferenciaId 
    ? transferencias.find(t => t.id === transferenciaId)
    : null;

  const generatePDF = async () => {
    if (!transferencia) return;

    setLoading(true);
    try {
      const element = document.getElementById('despacho-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Primeira via (Origem)
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      
      if (heightLeft >= pageHeight) {
        position = heightLeft - pageHeight;
        heightLeft -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
      }

      // Segunda via (Destino) - nova página
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      pdf.save(`transferencia-${transferencia.numero}-despacho.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!transferencia) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Despacho - Transferência #{transferencia.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Botões de ação */}
          <div className="flex gap-2 print:hidden">
            <Button onClick={generatePDF} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              {loading ? "Gerando..." : "Baixar PDF"}
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>

          {/* Conteúdo do despacho */}
          <div id="despacho-content" className="bg-white p-8 space-y-6 print:p-0">
            {/* Cabeçalho */}
            <div className="text-center border-b pb-6">
              <h1 className="text-2xl font-bold text-primary">DESPACHO DE TRANSFERÊNCIA</h1>
              <p className="text-lg font-semibold mt-2">#{transferencia.numero}</p>
              <p className="text-sm text-muted-foreground">
                Emitido em {format(new Date(), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
              </p>
            </div>

            {/* Informações da transferência */}
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">ORIGEM</h3>
                <div>
                  <p className="font-medium">{transferencia.origemLojaNome}</p>
                  <p className="text-sm text-muted-foreground">Loja remetente</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">DESTINO</h3>
                <div>
                  <p className="font-medium">{transferencia.destinoLojaNome}</p>
                  <p className="text-sm text-muted-foreground">Loja destinatária</p>
                </div>
              </div>
            </div>

            {/* Dados do transporte */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">TRANSPORTE</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Motorista</label>
                  <p className="font-medium">{transferencia.motorista || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Veículo</label>
                  <p className="font-medium">{transferencia.veiculo || 'Não informado'}</p>
                </div>
              </div>
            </div>

            {/* Lista de itens */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">ITENS TRANSFERIDOS</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Código</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Descrição</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Tipo</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Série</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferencia.itens.map((item, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 px-4 py-2 font-mono">
                          {item.codigoInterno || '-'}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {item.descricao}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Badge variant={item.tipo === 'SERIAL' ? 'default' : 'secondary'}>
                            {item.tipo}
                          </Badge>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 font-mono">
                          {item.serie || '-'}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                          {item.quantidade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Observações */}
            {transferencia.observacoes && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg border-b pb-2">OBSERVAÇÕES</h3>
                <p className="p-3 bg-gray-50 rounded border">{transferencia.observacoes}</p>
              </div>
            )}

            {/* Campos de assinatura */}
            <div className="space-y-6 mt-8">
              <h3 className="font-semibold text-lg border-b pb-2">ASSINATURAS</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="border-b border-gray-400 h-12 mb-2"></div>
                  <p className="font-medium">Motorista</p>
                  <p className="text-sm text-muted-foreground">
                    Nome: {transferencia.motorista || '_'.repeat(30)}
                  </p>
                  <p className="text-sm text-muted-foreground">Data: ___/___/______</p>
                </div>

                <div className="text-center">
                  <div className="border-b border-gray-400 h-12 mb-2"></div>
                  <p className="font-medium">Responsável (Origem)</p>
                  <p className="text-sm text-muted-foreground">{transferencia.origemLojaNome}</p>
                  <p className="text-sm text-muted-foreground">Data: ___/___/______</p>
                </div>

                <div className="text-center">
                  <div className="border-b border-gray-400 h-12 mb-2"></div>
                  <p className="font-medium">Responsável (Destino)</p>
                  <p className="text-sm text-muted-foreground">{transferencia.destinoLojaNome}</p>
                  <p className="text-sm text-muted-foreground">Data: ___/___/______</p>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="text-center text-xs text-muted-foreground border-t pt-4 mt-8">
              <p>Este documento comprova a transferência de equipamentos entre lojas</p>
              <p>Sistema ERP LocaAção - Documento não fiscal</p>
              <p>Via: Origem / Destino</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}