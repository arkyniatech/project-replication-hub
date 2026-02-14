import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Wand2 } from "lucide-react";
import type { TarefaLogistica } from "@/types";

interface SugerirHorariosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefas: TarefaLogistica[];
  onApply: (tarefas: TarefaLogistica[]) => void;
}

export function SugerirHorarios({ open, onOpenChange, tarefas, onApply }: SugerirHorariosProps) {
  const [opcoes, setOpcoes] = useState({
    entregasManha: true,
    comecarDistante: true,
    criticosPrimeiro: true
  });

  const aplicarSugestao = () => {
    // Mock da lógica de sugestão
    const tarefasOrdenadas = [...tarefas].sort((a, b) => {
      // Prioridade crítica primeiro se habilitado
      if (opcoes.criticosPrimeiro) {
        const prioridadeOrdem = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };
        const prioA = prioridadeOrdem[a.prioridade as keyof typeof prioridadeOrdem] ?? 4;
        const prioB = prioridadeOrdem[b.prioridade as keyof typeof prioridadeOrdem] ?? 4;
        if (prioA !== prioB) return prioA - prioB;
      }

      // Entregas pela manhã se habilitado
      if (opcoes.entregasManha) {
        if (a.tipo === 'ENTREGA' && b.tipo !== 'ENTREGA') return -1;
        if (b.tipo === 'ENTREGA' && a.tipo !== 'ENTREGA') return 1;
      }

      return 0;
    });

    // Redistribuir horários
    const novasTarefas = tarefasOrdenadas.map((tarefa, index) => {
      const horaBase = 8 + Math.floor(index * 0.75); // Espaçar por 45min
      const minutos = (index % 4) * 15; // Variar minutos
      
      const novaData = new Date();
      novaData.setHours(Math.min(horaBase, 17), minutos, 0, 0);
      
      return {
        ...tarefa,
        previstoISO: novaData.toISOString()
      };
    });

    onApply(novasTarefas);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Sugerir Horários
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="entregas-manha"
                checked={opcoes.entregasManha}
                onCheckedChange={(checked) => setOpcoes(prev => ({ ...prev, entregasManha: !!checked }))}
              />
              <label htmlFor="entregas-manha" className="text-sm font-medium">
                Priorizar entregas pela manhã
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="comecar-distante"
                checked={opcoes.comecarDistante}
                onCheckedChange={(checked) => setOpcoes(prev => ({ ...prev, comecarDistante: !!checked }))}
              />
              <label htmlFor="comecar-distante" className="text-sm font-medium">
                Começar pela mais distante
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="criticos-primeiro"
                checked={opcoes.criticosPrimeiro}
                onCheckedChange={(checked) => setOpcoes(prev => ({ ...prev, criticosPrimeiro: !!checked }))}
              />
              <label htmlFor="criticos-primeiro" className="text-sm font-medium">
                Equipamentos críticos no topo
              </label>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            O assistente irá reorganizar as tarefas conforme as regras selecionadas. 
            Você pode ajustar manualmente após aplicar.
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={aplicarSugestao}>
              Aplicar Sugestão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}