import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock } from "lucide-react";
import type { TarefaLogistica } from "@/types";

interface ReagendarTarefaModalProps {
  tarefa: TarefaLogistica;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tarefa: TarefaLogistica) => void;
}

export function ReagendarTarefaModal({ tarefa, open, onOpenChange, onSave }: ReagendarTarefaModalProps) {
  const [data, setData] = useState(new Date(tarefa.previstoISO).toISOString().split('T')[0]);
  const [hora, setHora] = useState(new Date(tarefa.previstoISO).toTimeString().slice(0, 5));
  const [observacao, setObservacao] = useState(tarefa.observacao || '');

  const salvar = () => {
    const novaData = new Date(`${data}T${hora}:00`);
    
    const tarefaAtualizada: TarefaLogistica = {
      ...tarefa,
      previstoISO: novaData.toISOString(),
      observacao,
      updatedAt: new Date().toISOString()
    };

    onSave(tarefaAtualizada);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reagendar Tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">{tarefa.cliente.nome}</h4>
            <p className="text-sm text-muted-foreground">{tarefa.endereco}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nova Data</label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Nova Hora</label>
              <Input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Observação (opcional)</label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Motivo do reagendamento ou observações"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar}>
              Reagendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}