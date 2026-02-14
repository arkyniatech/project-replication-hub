import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Phone, PhoneCall } from 'lucide-react';
import { MOTIVOS_NAO_SAIDA, MOTIVOS_NAO_ENTREGA, MotivoTipo } from '../types';

interface MotivoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: MotivoTipo;
  onConfirm: (dados: {
    motivo: string;
    observacoes?: string;
    solicitarAutorizacao: boolean;
    autorizacaoObservacoes?: string;
  }) => void;
}

export function MotivoModal({ open, onOpenChange, tipo, onConfirm }: MotivoModalProps) {
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [solicitarAutorizacao, setSolicitarAutorizacao] = useState(false);
  const [autorizacaoObservacoes, setAutorizacaoObservacoes] = useState('');

  const motivos = tipo === 'NAO_SAIDA' ? MOTIVOS_NAO_SAIDA : MOTIVOS_NAO_ENTREGA;
  const titulo = tipo === 'NAO_SAIDA' ? 'Motivo - Não Saída' : 'Motivo - Não Entregue';

  const handleConfirm = () => {
    if (!motivo) return;

    onConfirm({
      motivo,
      observacoes: observacoes || undefined,
      solicitarAutorizacao,
      autorizacaoObservacoes: solicitarAutorizacao ? autorizacaoObservacoes : undefined,
    });

    // Reset form
    setMotivo('');
    setObservacoes('');
    setSolicitarAutorizacao(false);
    setAutorizacaoObservacoes('');
  };

  const handleClose = () => {
    setMotivo('');
    setObservacoes('');
    setSolicitarAutorizacao(false);
    setAutorizacaoObservacoes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motivo..." />
              </SelectTrigger>
              <SelectContent>
                {motivos.map((motivoOption) => (
                  <SelectItem key={motivoOption} value={motivoOption}>
                    {motivoOption}
                  </SelectItem>
                ))}
                <SelectItem value="outros">Outros (especificar nas observações)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes adicionais..."
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="autorizacao"
                checked={solicitarAutorizacao}
                onCheckedChange={(checked) => setSolicitarAutorizacao(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="autorizacao"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Solicitar autorização do vendedor
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enviar notificação para o vendedor responsável pelo contrato
                </p>
              </div>
            </div>

            {solicitarAutorizacao && (
              <div className="mt-3 space-y-2">
                <Label htmlFor="autorizacao-obs">Mensagem para o vendedor</Label>
                <Textarea
                  id="autorizacao-obs"
                  value={autorizacaoObservacoes}
                  onChange={(e) => setAutorizacaoObservacoes(e.target.value)}
                  placeholder="Contexto adicional para o vendedor..."
                  rows={2}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!motivo}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}