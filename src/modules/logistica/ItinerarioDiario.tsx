import { useState, useRef } from 'react';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Printer, 
  Download, 
  FileText, 
  Truck, 
  Clock, 
  MapPin, 
  Phone, 
  PlayCircle,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  MessageCircle,
  Settings
} from 'lucide-react';
import { useItinerarioStore } from './store/itinerarioStore';
import { TarefaLogistica as TarefaLogisticaLocal, StatusTarefa, TipoTarefa, MotivoTipo } from './types';
import { MotivoModal } from './components/MotivoModal';
import { QuadroMotorista } from './components/QuadroMotorista';
import { SugerirHorariosModal } from './components/SugerirHorariosModal';
import { useReactToPrint } from 'react-to-print';
import { generatePDF } from '@/utils/print';
import { generateItineraryCSV } from '@/utils/csv';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import { useSupabaseLogisticaConfig } from '@/hooks/useSupabaseLogisticaConfig';
import { useSupabaseLogisticaTarefas } from '@/hooks/useSupabaseLogisticaTarefas';
import { useSupabaseLogisticaMotoristas } from '@/hooks/useSupabaseLogisticaMotoristas';
import { useSupabaseLogisticaVeiculos } from '@/hooks/useSupabaseLogisticaVeiculos';
import { useMultiunidade } from '@/hooks/useMultiunidade';

// Converter HH:MM:SS para minutos
const timeToMinutes = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Gerar slots de horário com base na config
const generateTimeSlots = (inicio: string = '08:00:00', fim: string = '18:00:00') => {
  const slots = [];
  const inicioMin = timeToMinutes(inicio);
  const fimMin = timeToMinutes(fim);
  
  for (let totalMin = inicioMin; totalMin < fimMin; totalMin += 30) {
    const hour = Math.floor(totalMin / 60);
    const minute = totalMin % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    slots.push(timeString);
  }
  return slots;
};

export function ItinerarioDiario() {
  const { can } = useRbacPermissions();
  const { session } = useMultiunidade();
  const lojaId = session.lojaAtivaId || '';
  const { config } = useSupabaseLogisticaConfig(lojaId);
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMotorista, setSelectedMotorista] = useState('all');
  const [selectedVeiculo, setSelectedVeiculo] = useState('all');
  const [filtroTipo, setFiltroTipo] = useState<TipoTarefa | 'TODOS'>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<StatusTarefa | 'TODOS'>('TODOS');
  const [motivoModalOpen, setMotivoModalOpen] = useState(false);
  const [motivoTipo, setMotivoTipo] = useState<MotivoTipo>('NAO_SAIDA');
  const [tarefaSelecionada, setTarefaSelecionada] = useState<TarefaLogisticaLocal | null>(null);
  const [sugerirHorariosOpen, setSugerirHorariosOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Buscar dados reais do Supabase
  const { tarefas: tarefasSupabase, updateTarefa: updateTarefaSupabase } = useSupabaseLogisticaTarefas({
    lojaId,
    dataInicio: `${selectedDate}T00:00:00`,
    dataFim: `${selectedDate}T23:59:59`,
  });

  const { motoristas } = useSupabaseLogisticaMotoristas(lojaId);
  const { veiculos } = useSupabaseLogisticaVeiculos(lojaId);

  // Usar horários da configuração ou fallback para 08:00-18:00
  const timeSlots = generateTimeSlots(
    config?.horario_inicio || '08:00:00',
    config?.horario_fim || '18:00:00'
  );

  // Converter tarefas do Supabase para o formato local
  const todasTarefas = tarefasSupabase.map(t => ({
    id: t.id,
    tipo: t.tipo as TipoTarefa,
    status: mapSupabaseStatusToLocal(t.status),
    prioridade: t.prioridade === 'BAIXA' ? 'NORMAL' as const :
                t.prioridade === 'ALTA' ? 'ALTA' as const :
                t.prioridade === 'CRITICA' ? 'CRITICA' as const : 'NORMAL' as const,
    cliente: { 
      nome: t.cliente_nome,
      fone: t.cliente_telefone || ''
    },
    endereco: formatEndereco(t.endereco),
    janela: {
      inicio: format(new Date(t.previsto_iso), 'HH:mm'),
      fim: format(new Date(new Date(t.previsto_iso).getTime() + t.duracao_min * 60000), 'HH:mm')
    },
    duracao: t.duracao_min,
    contratoNumero: t.contrato_id || '-',
    telefone: t.cliente_telefone,
    observacoes: t.observacoes,
    motivo: t.motivo_falha,
    itinerarioId: t.itinerario_id || ''
  }));

  // Aplicar filtros de tipo e status
  const tarefasFiltradas = todasTarefas.filter(tarefa => {
    if (filtroTipo !== 'TODOS' && tarefa.tipo !== filtroTipo) return false;
    if (filtroStatus !== 'TODOS' && tarefa.status !== filtroStatus) return false;
    return true;
  });

  // Função auxiliar para mapear status
  function mapSupabaseStatusToLocal(status: string): StatusTarefa {
    const map: Record<string, StatusTarefa> = {
      'AGENDAR': 'PENDENTE',
      'PROGRAMADO': 'PENDENTE',
      'EM_ROTA': 'EM_ROTA',
      'CONCLUIDO': 'CONCLUIDA',
      'REAGENDADO': 'REAGENDADA',
      'CANCELADO': 'NAO_SAIDA'
    };
    return map[status] || 'PENDENTE';
  }

  const getTarefasPorHorario = (horario: string) => {
    return tarefasFiltradas.filter(tarefa => {
      const inicioTarefa = tarefa.janela.inicio;
      return inicioTarefa === horario;
    });
  };

  const handleStatusChange = (tarefaId: string, novoStatus: StatusTarefa) => {
    const statusSupabase = mapLocalStatusToSupabase(novoStatus);
    updateTarefaSupabase({ id: tarefaId, updates: { status: statusSupabase as any } });
    
    const statusLabels = {
      'PENDENTE': 'Pendente',
      'EM_ROTA': 'Em Rota',
      'CONCLUIDA': 'Concluída',
      'REAGENDADA': 'Reagendada',
      'NAO_SAIDA': 'Não Saiu',
      'NAO_ENTREGUE': 'Não Entregue'
    };

    toast({
      title: "Status atualizado",
      description: `Tarefa marcada como: ${statusLabels[novoStatus]}`,
    });
  };

  // Função auxiliar para mapear status local para Supabase
  function mapLocalStatusToSupabase(status: StatusTarefa): string {
    const map: Record<StatusTarefa, string> = {
      'PENDENTE': 'PROGRAMADO',
      'EM_ROTA': 'EM_ROTA',
      'CONCLUIDA': 'CONCLUIDO',
      'REAGENDADA': 'REAGENDADO',
      'NAO_SAIDA': 'CANCELADO',
      'NAO_ENTREGUE': 'CANCELADO'
    };
    return map[status] || 'PROGRAMADO';
  }

  const handleMotivoConfirm = (dados: {
    motivo: string;
    observacoes?: string;
    solicitarAutorizacao: boolean;
    autorizacaoObservacoes?: string;
  }) => {
    if (!tarefaSelecionada) return;

    const novoStatus: StatusTarefa = motivoTipo === 'NAO_SAIDA' ? 'NAO_SAIDA' : 'NAO_ENTREGUE';
    
    updateTarefaSupabase({ 
      id: tarefaSelecionada.id, 
      updates: { 
        status: 'CANCELADO' as any,
        motivo_falha: dados.motivo,
        motivo_falha_tipo: motivoTipo,
        observacoes: dados.observacoes || tarefaSelecionada.observacoes
      } 
    });

    if (dados.solicitarAutorizacao) {
      toast({
        title: "Autorização solicitada",
        description: "Vendedor notificado sobre a situação da tarefa.",
      });
    }

    toast({
      title: "Motivo registrado",
      description: `Tarefa marcada como ${novoStatus === 'NAO_SAIDA' ? 'Não Saiu' : 'Não Entregue'}`,
    });

    setMotivoModalOpen(false);
    setTarefaSelecionada(null);
  };

  const handleNaoSaida = (tarefa: typeof todasTarefas[0]) => {
    setTarefaSelecionada(tarefa as any);
    setMotivoTipo('NAO_SAIDA');
    setMotivoModalOpen(true);
  };

  const handleNaoEntrega = (tarefa: typeof todasTarefas[0]) => {
    setTarefaSelecionada(tarefa as any);
    setMotivoTipo('NAO_ENTREGA');
    setMotivoModalOpen(true);
  };

  const enviarWhatsApp = (tarefa: TarefaLogisticaLocal) => {
    if (tarefa.telefone) {
      const numero = tarefa.telefone.replace(/\D/g, '');
      const mensagem = encodeURIComponent(
        `Olá! Sou da LocaAção Equipamentos. Estamos a caminho para o serviço do contrato ${tarefa.contratoNumero}. Chegamos em aproximadamente 30 minutos.`
      );
      window.open(`https://wa.me/55${numero}?text=${mensagem}`, '_blank');
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Quadro_Motorista_${selectedDate}`,
  });

  const handleExportPDF = async () => {
    if (printRef.current) {
      await generatePDF('quadro-motorista', `Quadro_Motorista_${selectedDate}.pdf`);
      toast({
        title: "PDF gerado",
        description: "Download iniciado automaticamente.",
      });
    }
  };

  const handleExportCSV = () => {
    if (tarefasFiltradas.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há tarefas no dia selecionado.",
        variant: "destructive"
      });
      return;
    }

    const motoristaSelecionado = motoristas.find(m => m.id === selectedMotorista);
    const veiculoSelecionado = veiculos.find(v => v.id === selectedVeiculo);

    generateItineraryCSV({
      tarefas: tarefasFiltradas.map(t => {
        const dataHoraInicio = new Date(`${selectedDate}T${t.janela.inicio}:00`);
        return {
          id: t.id,
          tipo: t.tipo,
          cliente: { nome: t.cliente.nome, fone: t.cliente.fone },
          endereco: t.endereco,
          coordenadas: undefined,
          previstoISO: dataHoraInicio.toISOString(),
          duracaoMin: t.duracao || 120,
          prioridade: t.prioridade === 'NORMAL' ? 'MEDIA' : t.prioridade,
          motoristaId: selectedMotorista !== 'all' ? selectedMotorista : undefined,
          veiculoId: selectedVeiculo !== 'all' ? selectedVeiculo : undefined,
          status: t.status === 'PENDENTE' ? 'PROGRAMADO' : 
                 t.status === 'EM_ROTA' ? 'EM_ROTA' : 
                 t.status === 'CONCLUIDA' ? 'CONCLUIDO' : 
                 t.status === 'REAGENDADA' ? 'REAGENDADO' : 
                 t.status === 'NAO_SAIDA' ? 'NAO_SAIU' : 
                 t.status === 'NAO_ENTREGUE' ? 'NAO_ENTREGUE' : 'PROGRAMADO',
          motivoFalha: t.motivo,
          observacao: t.observacoes,
          lojaId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }),
      data: selectedDate,
      loja: 'LocaAção Equipamentos',
      motorista: motoristaSelecionado ? {
        id: motoristaSelecionado.id,
        nome: motoristaSelecionado.nome,
        telefone: motoristaSelecionado.telefone || '',
        cnh: motoristaSelecionado.categoria_cnh || 'B',
        ativo: motoristaSelecionado.ativo
      } : undefined,
      veiculo: veiculoSelecionado ? {
        id: veiculoSelecionado.id,
        placa: veiculoSelecionado.placa,
        modelo: veiculoSelecionado.modelo,
        capacidadeM3: veiculoSelecionado.capacidade_m3 || 15,
        capacidadeKg: veiculoSelecionado.capacidade_kg || 3500,
        ativo: veiculoSelecionado.ativo
      } : undefined
    });

    toast({
      title: "CSV exportado",
      description: "Arquivo baixado com sucesso.",
    });
  };

  const handleAplicarSugestoes = (tarefasOtimizadas: TarefaLogisticaLocal[]) => {
    // Aplicar as sugestões de horário
    tarefasOtimizadas.forEach(tarefaOtimizada => {
      const [hours, minutes] = tarefaOtimizada.janela.inicio.split(':');
      const dataBase = new Date(selectedDate);
      dataBase.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      updateTarefaSupabase({ 
        id: tarefaOtimizada.id, 
        updates: { 
          previsto_iso: dataBase.toISOString(),
          duracao_min: tarefaOtimizada.duracao || 120
        } 
      });
    });

    toast({
      title: "Roteiro otimizado",
      description: `${tarefasOtimizadas.length} tarefas reorganizadas com sucesso.`,
    });
  };

  const getTipoColor = (tipo: TipoTarefa) => {
    switch (tipo) {
      case 'ENTREGA': return 'bg-blue-500';
      case 'RETIRADA': return 'bg-orange-500';
      case 'SUPORTE': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: StatusTarefa) => {
    switch (status) {
      case 'CONCLUIDA': return 'border-l-green-500 bg-green-50';
      case 'EM_ROTA': return 'border-l-blue-500 bg-blue-50';
      case 'REAGENDADA': return 'border-l-amber-500 bg-amber-50';
      case 'NAO_SAIDA':
      case 'NAO_ENTREGUE': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-slate-500 bg-slate-50';
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'CRITICA': return 'border-red-200 bg-red-50';
      case 'ALTA': return 'border-amber-200 bg-amber-50';
      default: return 'border-slate-200 bg-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Itinerário Diário</h1>
          <p className="text-muted-foreground">
            Agenda operacional de entregas, retiradas e assistência técnica
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setSugerirHorariosOpen(true)}
            disabled={!can('logistica:view')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Otimizar Roteiro
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Motorista</Label>
              <Select value={selectedMotorista} onValueChange={setSelectedMotorista}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos motoristas</SelectItem>
                  {motoristas.map((motorista) => (
                    <SelectItem key={motorista.id} value={motorista.id}>
                      {motorista.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={selectedVeiculo} onValueChange={setSelectedVeiculo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos veículos</SelectItem>
                  {veiculos.map((veiculo) => (
                    <SelectItem key={veiculo.id} value={veiculo.id}>
                      {veiculo.placa} - {veiculo.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filtroTipo} onValueChange={(value) => setFiltroTipo(value as TipoTarefa | 'TODOS')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="ENTREGA">Entrega</SelectItem>
                  <SelectItem value="RETIRADA">Retirada</SelectItem>
                  <SelectItem value="SUPORTE">Suporte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={(value) => setFiltroStatus(value as StatusTarefa | 'TODOS')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="EM_ROTA">Em Rota</SelectItem>
                  <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                  <SelectItem value="REAGENDADA">Reagendada</SelectItem>
                  <SelectItem value="NAO_SAIDA">Não saiu</SelectItem>
                  <SelectItem value="NAO_ENTREGUE">Não entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de horários */}
      <div className="grid gap-4">
        {timeSlots.map((slot) => {
          const tarefasDoSlot = getTarefasPorHorario(slot);
          
          return (
            <div key={slot} className="grid grid-cols-12 gap-4 items-start">
              {/* Coluna do horário */}
              <div className="col-span-1">
                <div className="sticky top-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {slot}
                  </div>
                </div>
              </div>

              {/* Coluna das tarefas */}
              <div className="col-span-11">
                {tarefasDoSlot.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {tarefasDoSlot.map((tarefa) => (
                      <Card 
                        key={tarefa.id} 
                        className={`border-l-4 ${getStatusColor(tarefa.status)} ${getPrioridadeColor(tarefa.prioridade)}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getTipoColor(tarefa.tipo)}`} />
                              <Badge variant="outline">{tarefa.tipo}</Badge>
                              {tarefa.prioridade !== 'NORMAL' && (
                                <Badge variant="destructive" className="text-xs">
                                  {tarefa.prioridade}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">
                              {tarefa.contratoNumero}
                            </span>
                          </div>
                          <CardTitle className="text-sm">{tarefa.cliente.nome}</CardTitle>
                        </CardHeader>
                        
                        <CardContent className="pt-0 space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-start gap-2 text-xs">
                              <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground break-all">
                                {tarefa.endereco}
                              </span>
                            </div>
                            
                            {tarefa.telefone && (
                              <div className="flex items-center gap-2 text-xs">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{tarefa.telefone}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {tarefa.janela.inicio} - {tarefa.janela.fim}
                                {tarefa.duracao && ` (${Math.ceil(tarefa.duracao / 60)}h)`}
                              </span>
                            </div>
                          </div>

                          {tarefa.observacoes && (
                            <p className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                              {tarefa.observacoes}
                            </p>
                          )}

                          {tarefa.motivo && (
                            <p className="text-xs text-destructive p-2 bg-destructive/10 rounded">
                              <strong>Motivo:</strong> {tarefa.motivo}
                            </p>
                          )}

                          {/* Ações */}
                          {can('logistica:view') && (
                            <div className="flex gap-1 flex-wrap">
                              {tarefa.status === 'PENDENTE' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusChange(tarefa.id, 'EM_ROTA')}
                                  className="h-7 text-xs"
                                >
                                  <PlayCircle className="h-3 w-3 mr-1" />
                                  Iniciar
                                </Button>
                              )}
                              
                              {tarefa.status === 'EM_ROTA' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusChange(tarefa.id, 'CONCLUIDA')}
                                  className="h-7 text-xs"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Concluir
                                </Button>
                              )}
                              
                              {['PENDENTE', 'EM_ROTA'].includes(tarefa.status) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleNaoSaida(tarefa)}
                                    className="h-7 text-xs"
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Não saiu
                                  </Button>
                                  
                                  {tarefa.status === 'EM_ROTA' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleNaoEntrega(tarefa)}
                                      className="h-7 text-xs"
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Não entregue
                                    </Button>
                                  )}
                                </>
                              )}
                              
                              {tarefa.telefone && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => enviarWhatsApp(tarefa)}
                                  className="h-7 text-xs"
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  WhatsApp
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="h-8"></div> // Espaçamento vazio
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Área oculta para impressão */}
      <div className="hidden">
        <div ref={printRef}>
          <QuadroMotorista 
            itinerario={{
              id: 'print-preview',
              dataISO: selectedDate,
              lojaId,
              motoristaId: selectedMotorista !== 'all' ? selectedMotorista : '',
              motoristaInfo: motoristas.find(m => m.id === selectedMotorista) 
                ? { 
                    id: motoristas.find(m => m.id === selectedMotorista)!.id,
                    nome: motoristas.find(m => m.id === selectedMotorista)!.nome,
                    telefone: motoristas.find(m => m.id === selectedMotorista)!.telefone || ''
                  }
                : { id: '', nome: 'Todos', telefone: '' },
              veiculoId: selectedVeiculo !== 'all' ? selectedVeiculo : '',
              veiculoInfo: veiculos.find(v => v.id === selectedVeiculo)
                ? {
                    id: veiculos.find(v => v.id === selectedVeiculo)!.id,
                    placa: veiculos.find(v => v.id === selectedVeiculo)!.placa,
                    modelo: veiculos.find(v => v.id === selectedVeiculo)!.modelo
                  }
                : { id: '', placa: '-', modelo: '-' },
              tarefas: tarefasFiltradas,
              status: 'PLANEJADO',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }}
            lojaNome="LocaAção Equipamentos"
          />
        </div>
      </div>

      {/* Modais */}
      <MotivoModal
        open={motivoModalOpen}
        onOpenChange={setMotivoModalOpen}
        tipo={motivoTipo}
        onConfirm={handleMotivoConfirm}
      />

      <SugerirHorariosModal
        open={sugerirHorariosOpen}
        onOpenChange={setSugerirHorariosOpen}
        tarefas={tarefasFiltradas}
        onAplicarSugestoes={handleAplicarSugestoes}
      />
    </div>
  );
}