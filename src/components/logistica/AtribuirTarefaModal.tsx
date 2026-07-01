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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Truck, User, Plus, X } from 'lucide-react';
import {
  useSupabaseLogisticaMotoristas,
  type LogisticaMotorista,
} from '@/hooks/useSupabaseLogisticaMotoristas';
import {
  useSupabaseLogisticaVeiculos,
  type LogisticaVeiculo,
} from '@/hooks/useSupabaseLogisticaVeiculos';

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
  /** Opcional: quando informado, habilita o botão "Cadastrar novo" inline sem sair do fluxo. */
  lojaId?: string;
}

export function AtribuirTarefaModal({
  open,
  onOpenChange,
  tarefas,
  motoristas,
  veiculos,
  onConfirm,
  isLoading,
  lojaId,
}: AtribuirTarefaModalProps) {
  const [motoristaId, setMotoristaId] = useState('');
  const [veiculoId, setVeiculoId] = useState('');
  const [showNovoMotorista, setShowNovoMotorista] = useState(false);
  const [showNovoVeiculo, setShowNovoVeiculo] = useState(false);
  const [novoMotoristaNome, setNovoMotoristaNome] = useState('');
  const [novoMotoristaTel, setNovoMotoristaTel] = useState('');
  const [novoVeiculoPlaca, setNovoVeiculoPlaca] = useState('');
  const [novoVeiculoModelo, setNovoVeiculoModelo] = useState('');

  const motoristasHook = useSupabaseLogisticaMotoristas(lojaId || '');
  const veiculosHook = useSupabaseLogisticaVeiculos(lojaId || '');

  const handleConfirm = () => {
    if (!motoristaId) return;
    onConfirm(motoristaId, veiculoId || null);
    setMotoristaId('');
    setVeiculoId('');
  };

  const cadastrarMotorista = async () => {
    if (!lojaId || !novoMotoristaNome.trim()) return;
    (motoristasHook as any).createMotorista(
      { nome: novoMotoristaNome.trim(), telefone: novoMotoristaTel.trim() || undefined, ativo: true },
      {
        onSuccess: (data: any) => {
          if (data?.id) setMotoristaId(data.id);
          setNovoMotoristaNome('');
          setNovoMotoristaTel('');
          setShowNovoMotorista(false);
        },
      }
    );
  };

  const cadastrarVeiculo = async () => {
    if (!lojaId || !novoVeiculoPlaca.trim() || !novoVeiculoModelo.trim()) return;
    (veiculosHook as any).createVeiculo(
      {
        placa: novoVeiculoPlaca.trim().toUpperCase(),
        modelo: novoVeiculoModelo.trim(),
        ativo: true,
      },
      {
        onSuccess: (data: any) => {
          if (data?.id) setVeiculoId(data.id);
          setNovoVeiculoPlaca('');
          setNovoVeiculoModelo('');
          setShowNovoVeiculo(false);
        },
      }
    );
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
          <div className="flex items-center justify-between">
            <Label>Motorista *</Label>
            {lojaId && !showNovoMotorista && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowNovoMotorista(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Cadastrar novo
              </Button>
            )}
          </div>
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
          {showNovoMotorista && (
            <div className="rounded-md border p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Novo motorista</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowNovoMotorista(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                placeholder="Nome do motorista"
                value={novoMotoristaNome}
                onChange={(e) => setNovoMotoristaNome(e.target.value)}
              />
              <Input
                placeholder="Telefone (opcional)"
                value={novoMotoristaTel}
                onChange={(e) => setNovoMotoristaTel(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={!novoMotoristaNome.trim() || (motoristasHook as any).isCreating}
                onClick={cadastrarMotorista}
              >
                {(motoristasHook as any).isCreating ? 'Salvando...' : 'Salvar motorista'}
              </Button>
            </div>
          )}
        </div>

        {/* Veículo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Veículo</Label>
            {lojaId && !showNovoVeiculo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowNovoVeiculo(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Cadastrar novo
              </Button>
            )}
          </div>
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
          {showNovoVeiculo && (
            <div className="rounded-md border p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Novo veículo</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowNovoVeiculo(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                placeholder="Placa (ex.: ABC1D23)"
                value={novoVeiculoPlaca}
                onChange={(e) => setNovoVeiculoPlaca(e.target.value)}
              />
              <Input
                placeholder="Modelo (ex.: Fiat Fiorino)"
                value={novoVeiculoModelo}
                onChange={(e) => setNovoVeiculoModelo(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={
                  !novoVeiculoPlaca.trim() ||
                  !novoVeiculoModelo.trim() ||
                  (veiculosHook as any).isCreating
                }
                onClick={cadastrarVeiculo}
              >
                {(veiculosHook as any).isCreating ? 'Salvando...' : 'Salvar veículo'}
              </Button>
            </div>
          )}
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
