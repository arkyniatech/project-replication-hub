import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Send, Printer, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface FaturaPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fatura?: {
    numero: string;
    cliente: string;
    emissao: string;
    vencimento: string;
    total: number;
    itens: Array<{
      descricao: string;
      quantidade: number;
      precoUnitario: number;
      subtotal: number;
      numeroContrato?: string;
      periodoInicio?: string;
      periodoFim?: string;
    }>;
  };
}

export function FaturaPreviewDrawer({
  open,
  onOpenChange,
  fatura
}: FaturaPreviewDrawerProps) {
  if (!fatura) return null;

  const handleGerarPDF = () => {
    toast.success("PDF da fatura gerado com sucesso!");
  };

  const handleEnviar = () => {
    toast.success("Fatura enviada para o cliente!");
  };

  const handleImprimir = () => {
    window.print();
    toast.success("Enviado para impressão");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                Fatura Emitida com Sucesso
              </DrawerTitle>
              <DrawerDescription>
                Fatura {fatura.numero} • {fatura.cliente}
              </DrawerDescription>
            </div>
            <Badge variant="outline" className="text-success border-success">
              EMITIDA
            </Badge>
          </div>
        </DrawerHeader>
        
        <div className="px-6 pb-6 overflow-y-auto">
          {/* Informações da Fatura */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Emissão:</span>
                <p className="font-medium">{format(parseISO(fatura.emissao), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Vencimento:</span>
                <p className="font-medium">{format(parseISO(fatura.vencimento), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            </div>
          </div>

          {/* Itens da Fatura */}
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-3">Itens</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Qtd</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Produto</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Contrato/Renovação</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Período</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Valor Unit.</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {fatura.itens.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 px-2">{item.quantidade}</td>
                      <td className="py-2 px-2 font-medium">{item.descricao}</td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {item.numeroContrato || "—"}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground text-xs">
                        {item.periodoInicio && item.periodoFim
                          ? `${format(parseISO(item.periodoInicio), "dd/MM/yyyy")} - ${format(parseISO(item.periodoFim), "dd/MM/yyyy")}`
                          : "—"}
                      </td>
                      <td className="py-2 px-2 text-right">{formatCurrency(item.precoUnitario)}</td>
                      <td className="py-2 px-2 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Total */}
          <div className="flex justify-between items-center text-lg font-bold mb-6">
            <span>Total da Fatura:</span>
            <span className="text-primary">{formatCurrency(fatura.total)}</span>
          </div>

          {/* Ações */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleGerarPDF} className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button onClick={handleImprimir} className="w-full" variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button onClick={handleEnviar} className="w-full col-span-2">
              <Send className="mr-2 h-4 w-4" />
              Enviar para Cliente
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}