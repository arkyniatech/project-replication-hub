import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CancelarContratoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoNumero: string;
  contratoStatus: string;
  onConfirm: (motivo: string) => Promise<void>;
}

export function CancelarContratoModal({
  open,
  onOpenChange,
  contratoNumero,
  contratoStatus,
  onConfirm,
}: CancelarContratoModalProps) {
  const [motivo, setMotivo] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Validar se contrato pode ser cancelado
  // ATIVO também pode ser cancelado se entrega não foi confirmada (validação feita no backend)
  const podeSerCancelado = 
    contratoStatus === 'RASCUNHO' || 
    contratoStatus === 'AGUARDANDO_ENTREGA' ||
    contratoStatus === 'ATIVO'; // Backend valida se entrega foi confirmada
  const motivoValido = motivo.trim().length >= 10;
  const podeConfirmar = podeSerCancelado && motivoValido && confirmado;

  const handleConfirm = async () => {
    if (!podeConfirmar) return;

    setIsProcessing(true);
    try {
      await onConfirm(motivo);
      // Resetar estado
      setMotivo('');
      setConfirmado(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao cancelar:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setMotivo('');
      setConfirmado(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Cancelar Contrato
          </DialogTitle>
          <DialogDescription>
            Você está prestes a cancelar o contrato <strong>{contratoNumero}</strong>.
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alertas de validação */}
          {!podeSerCancelado && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Cancelamento bloqueado:</strong> Contratos com status "{contratoStatus}" não podem ser cancelados.
              </AlertDescription>
            </Alert>
          )}

          {podeSerCancelado && contratoStatus === 'ATIVO' && (
            <Alert>
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription>
                <strong>Contrato ativo sem entrega confirmada:</strong> Este contrato está ativo, mas a logística ainda não confirmou a entrega. O cancelamento está disponível.
              </AlertDescription>
            </Alert>
          )}

          {podeSerCancelado && (
            <>
              {/* Motivo do cancelamento */}
              <div className="space-y-2">
                <Label htmlFor="motivo">
                  Motivo do cancelamento <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="motivo"
                  placeholder="Ex: Cliente solicitou cancelamento antes da entrega..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={4}
                  disabled={isProcessing}
                />
                {motivo.trim().length > 0 && motivo.trim().length < 10 && (
                  <p className="text-sm text-muted-foreground">
                    Mínimo de 10 caracteres ({motivo.trim().length}/10)
                  </p>
                )}
              </div>

              {/* Confirmação */}
              <div className="flex items-start space-x-2 rounded-md border border-destructive/20 bg-destructive/5 p-3">
                <Checkbox
                  id="confirmar"
                  checked={confirmado}
                  onCheckedChange={(checked) => setConfirmado(checked === true)}
                  disabled={!motivoValido || isProcessing}
                />
                <Label
                  htmlFor="confirmar"
                  className="text-sm font-normal leading-tight cursor-pointer"
                >
                  Confirmo o cancelamento deste contrato. Entendo que:
                  <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                    <li>Os equipamentos reservados serão liberados automaticamente</li>
                    <li>As tarefas de logística pendentes serão canceladas</li>
                    <li>Esta ação não pode ser revertida</li>
                  </ul>
                </Label>
              </div>

              {/* Informação adicional */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>O que acontece ao cancelar:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
                    <li>Status do contrato muda para "CANCELADO"</li>
                    <li>Equipamentos voltam como "DISPONÍVEL" no sistema</li>
                    <li>Tarefas de entrega são canceladas automaticamente</li>
                    <li>O evento é registrado na timeline de auditoria</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Voltar
          </Button>
          {podeSerCancelado && (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!podeConfirmar || isProcessing}
            >
              {isProcessing ? 'Cancelando...' : '🚫 Confirmar Cancelamento'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
