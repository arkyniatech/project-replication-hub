import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Truck, User } from 'lucide-react';
import type { LogisticaMotorista } from '@/hooks/useSupabaseLogisticaMotoristas';
import type { LogisticaVeiculo } from '@/hooks/useSupabaseLogisticaVeiculos';

interface TarefaResumo {
  id: string;
  cliente_nome: string;
  tipo: string;
}

interface AtribuirTarefaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefas: TarefaResumo[];
  motoristas: LogisticaMotorista[];
  veiculos: LogisticaVeiculo[];
  onConfirm: (motoristaId: string, veiculoId: string | null) => void;
  isLoading?: boolean;
}

export function AtribuirTarefaModal({
  open,
  onOpenChange,
  tarefas,
  motoristas,
  veiculos,
  onConfirm,
  isLoading,
}: AtribuirTarefaModalProps) {
  const [motoristaId, setMotoristaId] = useState('');
  const [veiculoId, setVeiculoId] = useState('');

  const handleConfirm = () => {
    if (!motoristaId) return;
    onConfirm(motoristaId, veiculoId || null);
    setMotoristaId('');
    setVeiculoId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Atribuir Motorista
          </DialogTitle>
          <DialogDescription>
            Selecione o motorista e veículo para {tarefas.length === 1 ? 'a tarefa' : `as ${tarefas.length} tarefas`} selecionada{tarefas.length > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        {/* Tarefas selecionadas */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tarefas</Label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {tarefas.map((t) => (
              <Badge key={t.id} variant="secondary" className="text-xs">
                {t.tipo} — {t.cliente_nome || 'Sem cliente'}
              </Badge>
            ))}
          </div>
        </div>

        {/* Motorista */}
        <div className="space-y-2">
          <Label>Motorista *</Label>
          <Select value={motoristaId} onValueChange={setMotoristaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o motorista" />
            </SelectTrigger>
            <SelectContent>
              {motoristas.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {m.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Veículo */}
        <div className="space-y-2">
          <Label>Veículo</Label>
          <Select value={veiculoId} onValueChange={setVeiculoId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o veículo (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {veiculos.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  <div className="flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    {v.placa} — {v.modelo}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!motoristaId || isLoading}>
            {isLoading ? 'Atribuindo...' : 'Atribuir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
