import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTransferenciasStore } from "@/stores/transferenciasStore";
import { MotivoRecusa } from "@/types/transferencias";
import { toast } from "sonner";

interface NegarTransferenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferenciaId: string | null;
  onConfirm: () => void;
}

const motivosRecusa = [
  { value: 'NUMERACAO', label: 'Numeração divergente', description: 'Código ou numeração não confere' },
  { value: 'DANO', label: 'Item danificado', description: 'Item chegou com avarias ou danos' },
  { value: 'DESTINO', label: 'Destino incorreto', description: 'Transferência enviada para loja errada' },
  { value: 'OUTRO', label: 'Outro motivo', description: 'Especificar no campo de detalhes' }
];

export function NegarTransferenciaModal({ 
  open, 
  onOpenChange, 
  transferenciaId,
  onConfirm 
}: NegarTransferenciaModalProps) {
  const { negar } = useTransferenciasStore();
  
  const [motivo, setMotivo] = useState<MotivoRecusa>('NUMERACAO');
  const [detalhe, setDetalhe] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setMotivo('NUMERACAO');
    setDetalhe("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!transferenciaId) return;

    // Validar se motivo OUTRO tem detalhe
    if (motivo === 'OUTRO' && !detalhe.trim()) {
      toast.error("Detalhe obrigatório para 'Outro motivo'");
      return;
    }

    setLoading(true);
    try {
      await negar(transferenciaId, motivo, detalhe.trim() || undefined);
      toast.success("Transferência recusada com sucesso!");
      onConfirm();
      handleClose();
    } catch (error) {
      toast.error("Erro ao recusar transferência");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-red-600">Recusar Transferência</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Motivo da recusa *</Label>
            <RadioGroup value={motivo} onValueChange={(value) => setMotivo(value as MotivoRecusa)}>
              {motivosRecusa.map((opcao) => (
                <div key={opcao.value} className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value={opcao.value} id={opcao.value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={opcao.value} className="font-medium cursor-pointer">
                      {opcao.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {opcao.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="detalhe">
              Detalhes {motivo === 'OUTRO' && '*'}
            </Label>
            <Textarea
              id="detalhe"
              value={detalhe}
              onChange={(e) => setDetalhe(e.target.value)}
              placeholder={
                motivo === 'OUTRO' 
                  ? "Descreva o motivo da recusa..." 
                  : "Informações adicionais (opcional)..."
              }
              rows={4}
              className={motivo === 'OUTRO' && !detalhe.trim() ? "border-red-300" : ""}
            />
            {motivo === 'OUTRO' && (
              <p className="text-xs text-muted-foreground">
                Campo obrigatório para "Outro motivo"
              </p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Ao recusar esta transferência, a loja de origem 
              poderá cancelá-la para restaurar o saldo dos itens.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || (motivo === 'OUTRO' && !detalhe.trim())}
          >
            {loading ? "Recusando..." : "Recusar Transferência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}