import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Truck, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TaxaDeslocamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  valorPadrao: number;
  contratoId: string;
  motivo: 'NAO_ENTREGA' | 'MANUAL' | 'SUBSTITUICAO';
  onSuccess: (valor: number, justificativa?: string) => void;
}

export function TaxaDeslocamentoModal({ 
  open, 
  onOpenChange, 
  valorPadrao, 
  contratoId,
  motivo,
  onSuccess 
}: TaxaDeslocamentoModalProps) {
  const [valor, setValor] = useState(valorPadrao);
  const [justificativa, setJustificativa] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showJustificativa, setShowJustificativa] = useState(false);
  const { toast } = useToast();

  // Reset form when modal opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setValor(valorPadrao);
      setJustificativa('');
      setShowJustificativa(false);
    }
    onOpenChange(newOpen);
  };

  // Check if justification is required
  const isValorAlterado = valor !== valorPadrao;
  const isValorZero = valor === 0;
  const requiresJustification = isValorAlterado || isValorZero;

  const handleValorChange = (novoValor: number) => {
    setValor(novoValor);
    // Show justification field if value changed or is zero
    if (novoValor !== valorPadrao || novoValor === 0) {
      setShowJustificativa(true);
    } else {
      setShowJustificativa(false);
      setJustificativa('');
    }
  };

  const handleConfirm = async () => {
    if (requiresJustification && !justificativa.trim()) {
      toast({
        variant: "destructive",
        title: "Justificativa obrigatória",
        description: "Informe o motivo da alteração do valor padrão"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onSuccess(valor, justificativa.trim() || undefined);
      handleOpenChange(false);
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao aplicar taxa de deslocamento"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (motivo === 'NAO_ENTREGA') {
      // For non-delivery, just close without applying fee
      handleOpenChange(false);
    } else {
      // For manual, also just close
      handleOpenChange(false);
    }
  };

  const getMotivoTitle = () => {
    switch (motivo) {
      case 'NAO_ENTREGA':
        return 'Taxa de Deslocamento - Não Entrega';
      case 'SUBSTITUICAO':
        return 'Taxa de Deslocamento - Substituição';
      case 'MANUAL':
        return 'Taxa de Deslocamento';
      default:
        return 'Taxa de Deslocamento';
    }
  };

  const getMotivoDescription = () => {
    switch (motivo) {
      case 'NAO_ENTREGA':
        return 'Cliente não recebeu o equipamento. Deseja cobrar taxa de deslocamento?';
      case 'SUBSTITUICAO':
        return 'Substituição com possível não entrega. Deseja cobrar taxa de deslocamento?';
      case 'MANUAL':
        return 'Adicionar taxa de deslocamento ao contrato';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            {getMotivoTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground">
            {getMotivoDescription()}
          </p>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="valor">Valor da Taxa</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                id="valor"
                type="number"
                min="0"
                step="0.01"
                value={valor}
                onChange={(e) => handleValorChange(Number(e.target.value))}
                className="pl-8"
                placeholder="0,00"
              />
            </div>
            {valor !== valorPadrao && (
              <p className="text-xs text-muted-foreground">
                Valor padrão da loja: R$ {valorPadrao.toFixed(2).replace('.', ',')}
              </p>
            )}
          </div>

          {/* Justificativa (when required) */}
          {showJustificativa && (
            <div className="space-y-2">
              <Label htmlFor="justificativa">
                Justificativa *
                {isValorZero && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (isenção de taxa)
                  </span>
                )}
              </Label>
              <Textarea
                id="justificativa"
                placeholder={
                  isValorZero 
                    ? "Motivo da isenção da taxa..."
                    : "Motivo da alteração do valor padrão..."
                }
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Warning for justification */}
          {requiresJustification && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {isValorZero 
                  ? "Justificativa obrigatória para isenção da taxa"
                  : "Justificativa obrigatória para alteração do valor padrão"
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              {motivo === 'NAO_ENTREGA' || motivo === 'SUBSTITUICAO' ? 'Não Cobrar' : 'Cancelar'}
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Aplicando..." : "Aplicar Taxa"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}