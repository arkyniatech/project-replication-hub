import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  AlertTriangle,
  Users,
  Truck,
  Wand2,
  Plus
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseLogisticaConfig } from "@/hooks/useSupabaseLogisticaConfig";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { SugerirHorarios } from "./SugerirHorarios";
import { ReagendarTarefaModal } from "./ReagendarTarefaModal";
import { ItineraryToolbar } from "./ItineraryToolbar";
import { ItineraryPrint } from "./ItineraryPrint";
import { generateItineraryCSV } from "@/utils/csv";
import { printElement, generatePDF } from "@/utils/print";
import { useReactToPrint } from "react-to-print";
import type { TarefaLogistica, Motorista, Veiculo, LayoutOptions } from "@/types";

export function ItinerarioDoDia() {
  const { toast } = useToast();
  const { session } = useMultiunidade();
  const lojaId = session.lojaAtivaId || '';
  const { config } = useSupabaseLogisticaConfig(lojaId);
  
  // Debug: verificar se config está carregando corretamente
  console.log('🔍 Debug Itinerário:', {
    lojaId,
    config,
    horario_inicio: config?.horario_inicio,
    isLoading: !config
  });
  
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMotorista, setSelectedMotorista] = useState<string>('');
  const [selectedVeiculo, setSelectedVeiculo] = useState<string>('');
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<TarefaLogistica | null>(null);
  
  // Layout options - persistir no localStorage
  const [layoutOptions, setLayoutOptions] = useState<LayoutOptions>(() => {
    const saved = localStorage.getItem('itinerary-layout-options');
    return saved ? JSON.parse(saved) : {
      modo: 'DETALHADO' as const,
      ordenacao: 'HORA' as const,
      mostrarTelefone: false,
      mostrarObservacoes: false,
      mostrarDuracao: true,
      mostrarPrioridade: true,
      quebrarPorTipo: false,
      cabecalhoEmTodas: true,
      marcaDagua: false
    };
  });
  const [tarefas, setTarefas] = useState<TarefaLogistica[]>([
    {
      id: '1',
      lojaId: '1',
      tipo: 'ENTREGA',
      cliente: { nome: 'João Silva', fone: '(11) 99999-1111' },
      endereco: 'Rua das Flores, 123 - Centro',
      previstoISO: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      duracaoMin: 30,
      prioridade: 'ALTA',
      status: 'PROGRAMADO',
      motoristaId: '1',
      veiculoId: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      lojaId: '1',
      tipo: 'RETIRADA',
      cliente: { nome: 'Maria Santos', fone: '(11) 88888-2222' },
      endereco: 'Av. Brasil, 456 - Vila Nova',
      previstoISO: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      duracaoMin: 20,
      prioridade: 'MEDIA',
      status: 'PROGRAMADO',
      motoristaId: '1',
      veiculoId: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]);

  // Mock data
  const motoristas: Motorista[] = [
    { id: '1', nome: 'Carlos Silva', telefone: '(11) 91111-1111', cnh: '12345678900', ativo: true },
    { id: '2', nome: 'Ana Costa', telefone: '(11) 92222-2222', cnh: '12345678901', ativo: true }
  ];

  const veiculos: Veiculo[] = [
    { id: '1', placa: 'ABC-1234', modelo: 'Fiorino', capacidadeM3: 2.5, capacidadeKg: 650, ativo: true },
    { id: '2', placa: 'DEF-5678', modelo: 'Sprinter', capacidadeM3: 10, capacidadeKg: 1500, ativo: true }
  ];

  // Gerar grid de horários com base na configuração
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    
    if (!config) {
      // Fallback padrão
      for (let hour = 8; hour <= 18; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
      }
      return slots;
    }

    const inicio = config.horario_inicio || '08:00';
    const fim = config.horario_fim || '18:00';
    const almocoInicio = config.intervalo_almoco_inicio || '12:00';
    const almocoFim = config.intervalo_almoco_fim || '13:00';

    // Converter horários para minutos desde meia-noite
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const inicioMin = toMinutes(inicio);
    const fimMin = toMinutes(fim);
    const almocoInicioMin = toMinutes(almocoInicio);
    const almocoFimMin = toMinutes(almocoFim);

    // Gerar slots de 30 em 30 minutos
    for (let min = inicioMin; min <= fimMin; min += 30) {
      // Pular intervalo de almoço
      if (min >= almocoInicioMin && min < almocoFimMin) {
        continue;
      }
      
      const h = Math.floor(min / 60);
      const m = min % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
    
    return slots;
  }, [config]);

  // Agrupar tarefas por horário
  const getTarefasPorHorario = (horario: string) => {
    return tarefas.filter(tarefa => {
      const tarefaHour = new Date(tarefa.previstoISO).getHours();
      const slotHour = parseInt(horario.split(':')[0]);
      return tarefaHour === slotHour;
    });
  };

  // Drag and Drop
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newHour = parseInt(destination.droppableId);
    
    setTarefas(prev => prev.map(tarefa => {
      if (tarefa.id === draggableId) {
        const currentDate = new Date(tarefa.previstoISO);
        currentDate.setHours(newHour, 0, 0, 0);
        return {
          ...tarefa,
          previstoISO: currentDate.toISOString()
        };
      }
      return tarefa;
    }));

    toast({
      title: "Horário atualizado",
      description: `Tarefa reagendada para ${newHour}:00h`
    });
  };

  // Enviar WhatsApp
  const enviarWhatsApp = (tarefa: TarefaLogistica) => {
    const mensagem = `Olá ${tarefa.cliente.nome}! Sua ${tarefa.tipo.toLowerCase()} está agendada para ${new Date(tarefa.previstoISO).toLocaleString('pt-BR')}. Em caso de dúvidas, entre em contato.`;
    const url = `https://wa.me/55${tarefa.cliente.fone.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  // Marcar não saída
  const marcarNaoSaida = (tarefa: TarefaLogistica) => {
    setTarefas(prev => prev.map(t => 
      t.id === tarefa.id 
        ? { ...t, status: 'NAO_SAIU', motivoFalha: 'Motorista atrasou' }
        : t
    ));
    
    toast({
      title: "Status atualizado",
      description: "Tarefa marcada como não saída",
      variant: "destructive"
    });
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'ENTREGA': return 'bg-green-100 text-green-700 border-green-200';
      case 'RETIRADA': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'SUPORTE': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'CRITICA': return 'border-l-red-500';
      case 'ALTA': return 'border-l-orange-500';
      case 'MEDIA': return 'border-l-yellow-500';
      case 'BAIXA': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  // Handlers para exportação
  const handleLayoutChange = (newOptions: LayoutOptions) => {
    setLayoutOptions(newOptions);
    localStorage.setItem('itinerary-layout-options', JSON.stringify(newOptions));
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Itinerário ${selectedDate} - ${motoristas.find(m => m.id === selectedMotorista)?.nome || 'Sem motorista'}`
  });

  const handleExportPDF = async () => {
    if (printRef.current) {
      try {
        await generatePDF('print-content', `itinerario_${selectedDate}.pdf`);
        toast({
          title: "PDF exportado",
          description: "O arquivo foi gerado com sucesso"
        });
      } catch (error) {
        toast({
          title: "Erro ao exportar PDF",
          description: "Não foi possível gerar o arquivo",
          variant: "destructive"
        });
      }
    }
  };

  const handleExportCSV = () => {
    const selectedMotoristaObj = motoristas.find(m => m.id === selectedMotorista);
    const selectedVeiculoObj = veiculos.find(v => v.id === selectedVeiculo);
    
    generateItineraryCSV({
      tarefas,
      data: selectedDate,
      loja: "Loja Principal",
      motorista: selectedMotoristaObj,
      veiculo: selectedVeiculoObj
    });

    toast({
      title: "CSV exportado",
      description: "O arquivo foi baixado com sucesso"
    });
  };

  const selectedMotoristaObj = motoristas.find(m => m.id === selectedMotorista);
  const selectedVeiculoObj = veiculos.find(v => v.id === selectedVeiculo);

  return (
    <div className="space-y-6">
      {/* Toolbar de Exportação */}
      <ItineraryToolbar
        tarefas={tarefas}
        selectedDate={selectedDate}
        selectedLoja="Loja Principal"
        selectedMotorista={selectedMotoristaObj?.nome}
        selectedVeiculo={selectedVeiculoObj?.modelo}
        layoutOptions={layoutOptions}
        onLayoutChange={handleLayoutChange}
        onPrint={handlePrint}
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
      />

      {/* Controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Itinerário do Dia
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSugestoes(true)}
                className="flex items-center gap-2"
              >
                <Wand2 className="h-4 w-4" />
                Sugerir Horários
              </Button>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Tarefa
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Data</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Motorista</label>
              <Select value={selectedMotorista} onValueChange={setSelectedMotorista}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {motoristas.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Veículo</label>
              <Select value={selectedVeiculo} onValueChange={setSelectedVeiculo}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {veiculos.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.placa} - {v.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade de Horários */}
      <Card>
        <CardContent className="p-0">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="space-y-0 border-r">
              {timeSlots.map((slot, index) => {
                const hour = parseInt(slot.split(':')[0]);
                const tarefasHorario = getTarefasPorHorario(slot);
                
                return (
                  <div key={slot} className="border-b border-border">
                    <div className="grid grid-cols-[80px_1fr] min-h-[80px]">
                      {/* Coluna do horário */}
                      <div className="border-r border-border p-3 flex items-start">
                        <div className="text-sm font-medium text-muted-foreground">
                          {slot}
                        </div>
                      </div>

                      {/* Área das tarefas */}
                      <Droppable droppableId={hour.toString()}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`p-3 min-h-[80px] space-y-2 ${
                              snapshot.isDraggingOver ? 'bg-accent' : ''
                            }`}
                          >
                            {tarefasHorario.map((tarefa, index) => (
                              <Draggable key={tarefa.id} draggableId={tarefa.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`${
                                      snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                                    }`}
                                  >
                                    <Card className={`border-l-4 ${getPrioridadeColor(tarefa.prioridade)} hover:shadow-md transition-shadow cursor-move`}>
                                      <CardContent className="p-3">
                                        <div className="flex items-start justify-between">
                                          <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className={getTipoColor(tarefa.tipo)}>
                                                {tarefa.tipo}
                                              </Badge>
                                              <Badge variant="outline">
                                                {tarefa.duracaoMin}min
                                              </Badge>
                                            </div>
                                            <h4 className="font-medium text-sm">
                                              {tarefa.cliente.nome}
                                            </h4>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                              <MapPin className="h-3 w-3" />
                                              {tarefa.endereco}
                                            </p>
                                          </div>

                                          <div className="flex gap-1">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => enviarWhatsApp(tarefa)}
                                              className="h-6 w-6 p-0"
                                            >
                                              <MessageSquare className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => setEditingTarefa(tarefa)}
                                              className="h-6 w-6 p-0"
                                            >
                                              <Clock className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => marcarNaoSaida(tarefa)}
                                              className="h-6 w-6 p-0"
                                            >
                                              <AlertTriangle className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            
                            {tarefasHorario.length === 0 && (
                              <div className="text-center py-4 text-muted-foreground text-sm">
                                Arraste tarefas para este horário
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </CardContent>
      </Card>

      {/* Modals */}
      <SugerirHorarios
        open={showSugestoes}
        onOpenChange={setShowSugestoes}
        tarefas={tarefas}
        onApply={(novasTarefas) => {
          setTarefas(novasTarefas);
          setShowSugestoes(false);
          toast({
            title: "Horários aplicados",
            description: "Os horários sugeridos foram aplicados"
          });
        }}
      />

      {editingTarefa && (
        <ReagendarTarefaModal
          tarefa={editingTarefa}
          open={!!editingTarefa}
          onOpenChange={(open) => !open && setEditingTarefa(null)}
          onSave={(tarefaAtualizada) => {
            setTarefas(prev => prev.map(t => 
              t.id === tarefaAtualizada.id ? tarefaAtualizada : t
            ));
            setEditingTarefa(null);
            toast({
              title: "Tarefa reagendada",
              description: "Os dados foram atualizados"
            });
          }}
        />
      )}

      {/* Componente de Impressão */}
      <div id="print-content">
        <ItineraryPrint
          ref={printRef}
          data={selectedDate}
          loja="Loja Principal"
          motorista={selectedMotoristaObj}
          veiculo={selectedVeiculoObj}
          tarefas={tarefas}
          layoutOptions={layoutOptions}
        />
      </div>
    </div>
  );
}