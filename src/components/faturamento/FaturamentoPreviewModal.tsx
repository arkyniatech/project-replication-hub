import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import type { LancamentoFaturavel, FaturaTotais } from "@/types/faturamento";

interface FaturamentoPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itens: LancamentoFaturavel[];
  totais: FaturaTotais;
  vencimento: string;
  observacoes?: string;
}

export function FaturamentoPreviewModal({
  open,
  onOpenChange,
  itens,
  totais,
  vencimento,
  observacoes
}: FaturamentoPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Preview da Fatura</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm">
            <p><strong>Vencimento:</strong> {vencimento}</p>
            <p><strong>Total:</strong> {formatCurrency(totais.total)}</p>
            <p><strong>Itens:</strong> {totais.itensSelecionados}</p>
          </div>
          
          {observacoes && (
            <div className="text-sm">
              <p><strong>Observações:</strong></p>
              <p className="text-muted-foreground">{observacoes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}