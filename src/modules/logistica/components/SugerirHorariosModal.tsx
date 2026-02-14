import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Truck, Zap, AlertTriangle } from 'lucide-react';
import { TarefaLogistica } from '../types';

interface SugerirHorariosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefas: TarefaLogistica[];
  onAplicarSugestoes: (tarefasOrdenadas: TarefaLogistica[]) => void;
}

export function SugerirHorariosModal({ 
  open, 
  onOpenChange, 
  tarefas, 
  onAplicarSugestoes 
}: SugerirHorariosModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Algoritmo simples de otimização
  const otimizarRoteiro = (tarefas: TarefaLogistica[]): TarefaLogistica[] => {
    const tarefasOrdenadas = [...tarefas];
    
    // 1. Prioridades primeiro (CRITICA > ALTA > NORMAL)
    tarefasOrdenadas.sort((a, b) => {
      const prioridadeScore = { 'CRITICA': 3, 'ALTA': 2, 'NORMAL': 1 };
      const scoreA = prioridadeScore[a.prioridade] || 1;
      const scoreB = prioridadeScore[b.prioridade] || 1;
      
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      // 2. Depois por tipo (ENTREGA primeiro, depois ASSISTENCIA, por último RETIRADA)
      const tipoScore = { 'ENTREGA': 3, 'ASSISTENCIA': 2, 'RETIRADA': 1 };
      const tipoA = tipoScore[a.tipo] || 1;
      const tipoB = tipoScore[b.tipo] || 1;
      
      if (tipoA !== tipoB) return tipoB - tipoA;
      
      // 3. Finalmente por proximidade simulada (usando CEP como base)
      const cepA = a.endereco.match(/\d{5}-?\d{3}/) || ['00000'];
      const cepB = b.endereco.match(/\d{5}-?\d{3}/) || ['00000'];
      return cepA[0].localeCompare(cepB[0]);
    });
    
    // Redistribuir horários começando às 08:00
    let horaAtual = 8;
    const tarefasComNovoHorario = tarefasOrdenadas.map((tarefa, index) => {
      const duracao = tarefa.duracao ? Math.ceil(tarefa.duracao / 60) : 2; // Default 2h
      const novoHorario = {
        inicio: `${horaAtual.toString().padStart(2, '0')}:00`,
        fim: `${(horaAtual + duracao).toString().padStart(2, '0')}:00`
      };
      
      horaAtual += duracao;
      
      return {
        ...tarefa,
        janela: novoHorario
      };
    });
    
    return tarefasComNovoHorario;
  };

  const tarefasOtimizadas = otimizarRoteiro(tarefas.filter(t => t.status === 'PENDENTE'));
  
  const handleAplicar = async () => {
    setLoading(true);
    
    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onAplicarSugestoes(tarefasOtimizadas);
    setLoading(false);
    onOpenChange(false);
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'ENTREGA': return 'bg-blue-100 text-blue-800';
      case 'RETIRADA': return 'bg-orange-100 text-orange-800';
      case 'ASSISTENCIA': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrioridadeIcon = (prioridade: string) => {
    switch (prioridade) {
      case 'CRITICA': return <AlertTriangle className="h-3 w-3 text-red-600" />;
      case 'ALTA': return <Zap className="h-3 w-3 text-amber-600" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Sugestão de Roteiro Otimizado
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Critérios de Otimização:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Prioridade das tarefas (Crítica → Alta → Normal)</li>
                <li>• Tipo de serviço (Entrega → Assistência → Retirada)</li>
                <li>• Proximidade geográfica aproximada</li>
                <li>• Janelas de tempo disponíveis</li>
              </ul>
            </div>

            {tarefasOtimizadas.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-medium">Roteiro Sugerido ({tarefasOtimizadas.length} tarefas):</h4>
                {tarefasOtimizadas.map((tarefa, index) => (
                  <Card key={tarefa.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded font-medium">
                              #{index + 1}
                            </span>
                            <Badge variant="outline" className={getTipoColor(tarefa.tipo)}>
                              {tarefa.tipo}
                            </Badge>
                            {getPrioridadeIcon(tarefa.prioridade)}
                            <span className="font-medium text-sm">{tarefa.contratoNumero}</span>
                          </div>
                          <p className="text-sm font-medium">{tarefa.cliente.nome}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {tarefa.endereco}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Clock className="h-4 w-4" />
                            {tarefa.janela.inicio} - {tarefa.janela.fim}
                          </div>
                          {tarefa.duracao && (
                            <p className="text-xs text-muted-foreground">
                              {Math.ceil(tarefa.duracao / 60)}h estimadas
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma tarefa pendente para otimizar</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAplicar} 
            disabled={tarefasOtimizadas.length === 0 || loading}
          >
            {loading ? 'Aplicando...' : 'Aplicar Sugestões'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}