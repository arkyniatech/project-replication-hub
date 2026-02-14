import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { 
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Ban,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseLogisticaTarefas } from "@/hooks/useSupabaseLogisticaTarefas";
import { useMultiunidade } from "@/hooks/useMultiunidade";

const COLUNAS = [
  { id: 'AGENDAR', title: 'Agendar', status: 'AGENDAR', color: 'bg-gray-50' },
  { id: 'PROGRAMADO', title: 'Programado', status: 'PROGRAMADO', color: 'bg-blue-50' },
  { id: 'EM_ROTA', title: 'Em Rota', status: 'EM_ROTA', color: 'bg-yellow-50' },
  { id: 'CONCLUIDO', title: 'Concluído', status: 'CONCLUIDO', color: 'bg-green-50' },
  { id: 'REAGENDADO', title: 'Reagendado/Cancelado', status: 'REAGENDADO', color: 'bg-red-50' }
];

const MOTIVOS_NAO_SAIDA = [
  'Motorista atrasou',
  'Cliente reagendou',
  'Equipamento não liberado',
  'Problemas com veículo'
];

const MOTIVOS_NAO_ENTREGA = [
  'Cliente ausente',
  'Local não encontrado',
  'Descarga inadequada',
  'Cliente rejeitou'
];

export function QuadroLogistica() {
  const { toast } = useToast();
  const { session } = useMultiunidade();
  const lojaId = session.lojaAtivaId || '';
  
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');

  // Buscar tarefas do Supabase
  const dataFim = new Date(filtroData);
  dataFim.setHours(23, 59, 59, 999);
  
  const { tarefas, updateTarefa, isLoading } = useSupabaseLogisticaTarefas({
    lojaId,
    dataInicio: filtroData,
    dataFim: dataFim.toISOString().split('T')[0],
  });

  // Filtrar tarefas por tipo
  const tarefasFiltradas = useMemo(() => {
    return tarefas.filter(tarefa => {
      const tipoMatch = filtroTipo === 'TODOS' || tarefa.tipo === filtroTipo;
      return tipoMatch;
    });
  }, [tarefas, filtroTipo]);

  // Agrupar por status
  const getTarefasPorStatus = (status: string) => {
    return tarefasFiltradas.filter(tarefa => tarefa.status === status);
  };

  // Drag and Drop
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, source, destination } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const novoStatus = destination.droppableId as any;
    
    // Atualizar no Supabase
    updateTarefa({
      id: draggableId,
      updates: { status: novoStatus }
    });

    toast({
      title: "Status atualizado",
      description: `Tarefa movida para ${COLUNAS.find(c => c.id === novoStatus)?.title}`
    });
  };

  // Marcar falha
  const marcarFalha = (tarefaId: string, motivo: string, motivo_tipo: string, lancarTaxa = false) => {
    updateTarefa({
      id: tarefaId,
      updates: {
        status: 'CANCELADO',
        motivo_falha: motivo,
        motivo_falha_tipo: motivo_tipo
      }
    });

    toast({
      title: "Falha registrada",
      description: lancarTaxa ? "Taxa de deslocamento lançada" : "Motivo registrado",
      variant: "destructive"
    });
  };

  // Reagendar tarefa
  const reagendar = (tarefaId: string) => {
    const novaData = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    updateTarefa({
      id: tarefaId,
      updates: {
        status: 'REAGENDADO',
        previsto_iso: novaData.toISOString()
      }
    });

    toast({
      title: "Tarefa reagendada",
      description: "Reagendada para amanhã"
    });
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'ENTREGA': return 'bg-green-100 text-green-700';
      case 'RETIRADA': return 'bg-blue-100 text-blue-700';
      case 'SUPORTE': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPrioridadeIcon = (prioridade: string) => {
    switch (prioridade) {
      case 'CRITICA': return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case 'ALTA': return <AlertTriangle className="h-3 w-3 text-orange-500" />;
      case 'MEDIA': return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'BAIXA': return <Clock className="h-3 w-3 text-green-500" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Carregando tarefas...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Quadro de Logística
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium">Data</label>
              <input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="ENTREGA">Entrega</SelectItem>
                  <SelectItem value="RETIRADA">Retirada</SelectItem>
                  <SelectItem value="SUPORTE">Suporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {COLUNAS.map((coluna) => {
            const tarefasColuna = getTarefasPorStatus(coluna.status);
            
            return (
              <div key={coluna.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">{coluna.title}</h3>
                  <Badge variant="secondary">{tarefasColuna.length}</Badge>
                </div>

                <Droppable droppableId={coluna.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[400px] rounded-lg p-3 space-y-2 ${
                        coluna.color
                      } ${snapshot.isDraggingOver ? 'bg-accent' : ''}`}
                    >
                      {tarefasColuna.map((tarefa, index) => (
                        <Draggable key={tarefa.id} draggableId={tarefa.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${snapshot.isDragging ? 'rotate-2' : ''}`}
                            >
                              <Card className="cursor-move hover:shadow-md transition-shadow">
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Badge className={getTipoColor(tarefa.tipo)}>
                                      {tarefa.tipo}
                                    </Badge>
                                    {getPrioridadeIcon(tarefa.prioridade)}
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium text-sm">{tarefa.cliente_nome}</h4>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {tarefa.endereco?.logradouro || 'Endereço não informado'}
                                    </p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(tarefa.previsto_iso).toLocaleTimeString('pt-BR', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </p>
                                  </div>

                                  {tarefa.motivo_falha && (
                                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                      {tarefa.motivo_falha}
                                    </div>
                                  )}

                                  <div className="flex gap-1 pt-2">
                                    {tarefa.cliente_telefone && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => window.open(`tel:${tarefa.cliente_telefone}`, '_self')}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Phone className="h-3 w-3" />
                                      </Button>
                                    )}
                                    
                                    {tarefa.status === 'PROGRAMADO' && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => marcarFalha(tarefa.id, 'Motorista atrasou', 'NAO_SAIDA')}
                                          className="h-6 w-6 p-0"
                                        >
                                          <XCircle className="h-3 w-3 text-red-500" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => reagendar(tarefa.id)}
                                          className="h-6 w-6 p-0"
                                        >
                                          <RotateCcw className="h-3 w-3 text-blue-500" />
                                        </Button>
                                      </>
                                    )}

                                    {tarefa.status === 'EM_ROTA' && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => marcarFalha(tarefa.id, 'Cliente ausente', 'NAO_ENTREGA', true)}
                                          className="h-6 w-6 p-0"
                                        >
                                          <XCircle className="h-3 w-3 text-red-500" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0"
                                        >
                                          <CheckCircle className="h-3 w-3 text-green-500" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {tarefasColuna.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Nenhuma tarefa
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}