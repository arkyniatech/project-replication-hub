import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { reabrirCompetenciaDRE, formatPeriodoDisplay } from '@/lib/dre-fechamento-utils';
import { UnlockIcon, AlertTriangle } from 'lucide-react';

interface ReabrirCompetenciaModalProps {
  open: boolean;
  onClose: () => void;
  competencia: string;
  lojas: Array<{ id: string; nome: string }>;
  onReaberturaComplete: () => void;
}

export function ReabrirCompetenciaModal({ 
  open, 
  onClose, 
  competencia, 
  lojas,
  onReaberturaComplete 
}: ReabrirCompetenciaModalProps) {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmarReabertura = async () => {
    if (!motivo.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe o motivo da reabertura",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      reabrirCompetenciaDRE(
        competencia,
        lojas.map(l => l.id),
        motivo.trim(),
        'admin' // Mock user
      );

      toast({
        title: "Competência reaberta com sucesso",
        description: `${formatPeriodoDisplay(competencia)} foi reaberto para edição`
      });

      onReaberturaComplete();
      onClose();
      setMotivo('');
    } catch (error) {
      toast({
        title: "Erro na reabertura",
        description: "Houve um problema ao reabrir a competência",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UnlockIcon className="w-5 h-5" />
            Reabrir Competência
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Reabertura auditada:</strong> Você está prestes a reabrir a competência 
              <strong> {formatPeriodoDisplay(competencia)}</strong>. Esta ação será registrada 
              no log de auditoria. O snapshot existente será preservado.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da reabertura *</Label>
            <Textarea
              id="motivo"
              placeholder="Descreva o motivo da reabertura da competência..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {motivo.length}/500 caracteres
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmarReabertura} 
            disabled={!motivo.trim() || isProcessing}
            variant="destructive"
          >
            {isProcessing ? 'Processando...' : 'Confirmar Reabertura'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}