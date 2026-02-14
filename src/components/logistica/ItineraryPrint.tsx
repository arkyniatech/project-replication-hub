import { forwardRef } from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, AlertTriangle, Phone, FileText } from "lucide-react";
import type { TarefaLogistica, LayoutOptions, Motorista, Veiculo } from "@/types";

interface ItineraryPrintProps {
  data: string;
  loja: string;
  motorista?: Motorista;
  veiculo?: Veiculo;
  tarefas: TarefaLogistica[];
  layoutOptions: LayoutOptions;
}

export const ItineraryPrint = forwardRef<HTMLDivElement, ItineraryPrintProps>(
  ({ data, loja, motorista, veiculo, tarefas, layoutOptions }, ref) => {
    // Filtrar e ordenar tarefas
    const tarefasValidas = tarefas.filter(t => 
      ['PROGRAMADO', 'EM_ROTA', 'REAGENDADO'].includes(t.status)
    );

    const tarefasOrdenadas = [...tarefasValidas].sort((a, b) => {
      if (layoutOptions.ordenacao === 'TIPO_HORA') {
        if (a.tipo !== b.tipo) {
          const ordem = { ENTREGA: 0, RETIRADA: 1, SUPORTE: 2 };
          return ordem[a.tipo] - ordem[b.tipo];
        }
      }
      return new Date(a.previstoISO).getTime() - new Date(b.previstoISO).getTime();
    });

    // Agrupar por tipo se necessário
    const tarefasPorTipo = layoutOptions.quebrarPorTipo ? {
      ENTREGA: tarefasOrdenadas.filter(t => t.tipo === 'ENTREGA'),
      RETIRADA: tarefasOrdenadas.filter(t => t.tipo === 'RETIRADA'),
      SUPORTE: tarefasOrdenadas.filter(t => t.tipo === 'SUPORTE')
    } : null;

    const formatTime = (iso: string) => {
      return new Date(iso).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    };

    const formatDate = (dateStr: string) => {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
    };

    const getTipoLabel = (tipo: string) => {
      const labels = {
        ENTREGA: 'Entrega',
        RETIRADA: 'Retirada', 
        SUPORTE: 'Suporte'
      };
      return labels[tipo as keyof typeof labels] || tipo;
    };

    const getTipoColor = (tipo: string) => {
      const colors = {
        ENTREGA: 'text-green-600',
        RETIRADA: 'text-blue-600',
        SUPORTE: 'text-orange-600'
      };
      return colors[tipo as keyof typeof colors] || 'text-gray-600';
    };

    const getPrioridadeIcon = (prioridade: string) => {
      if (prioridade === 'CRITICA' || prioridade === 'ALTA') {
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      }
      return null;
    };

    const renderTarefa = (tarefa: TarefaLogistica, index: number) => (
      <div 
        key={tarefa.id} 
        className={`flex gap-3 py-2 border-b border-gray-200 break-inside-avoid ${
          layoutOptions.modo === 'COMPACTO' ? 'text-sm' : ''
        }`}
      >
        <div className="flex-shrink-0 w-6">
          <div className="w-4 h-4 border border-gray-400 rounded"></div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">
              {formatTime(tarefa.previstoISO)}
            </span>
            <span className={`font-medium ${getTipoColor(tarefa.tipo)}`}>
              {getTipoLabel(tarefa.tipo)}
            </span>
            {tarefa.contratoId && (
              <span className="text-xs text-gray-500">
                #{tarefa.contratoId}
              </span>
            )}
            {tarefa.status === 'REAGENDADO' && (
              <Badge variant="secondary" className="text-xs">
                Reagendado
              </Badge>
            )}
            {layoutOptions.mostrarPrioridade && getPrioridadeIcon(tarefa.prioridade)}
          </div>
          
          <div className="font-semibold text-gray-900 mb-1">
            {tarefa.cliente.nome}
            {layoutOptions.mostrarTelefone && tarefa.cliente.fone && (
              <span className="font-normal text-gray-600 ml-2">
                {tarefa.cliente.fone}
              </span>
            )}
          </div>
          
          <div className="text-gray-700 flex items-start gap-1">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{tarefa.endereco}</span>
          </div>
          
          {layoutOptions.mostrarDuracao && (
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              {tarefa.duracaoMin} min
            </div>
          )}
          
          {layoutOptions.mostrarObservacoes && tarefa.observacao && (
            <div className="text-xs text-gray-600 flex items-start gap-1 mt-1">
              <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{tarefa.observacao}</span>
            </div>
          )}
        </div>
      </div>
    );

    const renderTarefaGroup = (tipo: string, tarefasList: TarefaLogistica[]) => (
      <div key={tipo} className="mb-6">
        <h3 className="font-semibold text-lg mb-3 pb-1 border-b-2 border-gray-300">
          {getTipoLabel(tipo)} ({tarefasList.length})
        </h3>
        {tarefasList.map((tarefa, index) => renderTarefa(tarefa, index))}
      </div>
    );

    const totalTarefas = tarefasOrdenadas.length;
    const entregas = tarefasOrdenadas.filter(t => t.tipo === 'ENTREGA').length;
    const retiradas = tarefasOrdenadas.filter(t => t.tipo === 'RETIRADA').length;
    const suportes = tarefasOrdenadas.filter(t => t.tipo === 'SUPORTE').length;

    return (
      <div ref={ref} className="print:block hidden">
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 12mm;
            }
            .break-inside-avoid {
              break-inside: avoid;
            }
            .page-break {
              page-break-before: always;
            }
          }
        `}</style>
        
        <div className="relative bg-white text-black">
          {layoutOptions.marcaDagua && (
            <div className="absolute inset-0 flex items-center justify-center opacity-10 text-6xl font-bold text-gray-400 pointer-events-none z-10 rotate-45">
              CÓPIA DE TRABALHO
            </div>
          )}
          
          {/* Cabeçalho */}
          <div className="mb-6 pb-4 border-b-2 border-gray-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Itinerário do Dia
                </h1>
                <p className="text-gray-600">{loja}</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Data: <span className="font-medium">{formatDate(data)}</span></p>
                {motorista && (
                  <p>Motorista: <span className="font-medium">{motorista.nome}</span></p>
                )}
                {veiculo && (
                  <p>Veículo: <span className="font-medium">{veiculo.placa} - {veiculo.modelo}</span></p>
                )}
              </div>
            </div>
            
            {/* Resumo */}
            <div className="flex gap-4 text-sm">
              <div className="bg-gray-100 px-3 py-1 rounded">
                <span className="font-medium">{totalTarefas}</span> Tarefas
              </div>
              <div className="bg-green-100 px-3 py-1 rounded text-green-700">
                <span className="font-medium">{entregas}</span> Entregas
              </div>
              <div className="bg-blue-100 px-3 py-1 rounded text-blue-700">
                <span className="font-medium">{retiradas}</span> Retiradas
              </div>
              <div className="bg-orange-100 px-3 py-1 rounded text-orange-700">
                <span className="font-medium">{suportes}</span> Suportes
              </div>
              <div className="bg-gray-100 px-3 py-1 rounded">
                Janela: 07:15–11:30 / 12:30–17:03
              </div>
            </div>
          </div>
          
          {/* Corpo */}
          <div className="space-y-1">
            {layoutOptions.quebrarPorTipo && tarefasPorTipo ? (
              <div>
                {Object.entries(tarefasPorTipo).map(([tipo, tarefasList]) => 
                  tarefasList.length > 0 && renderTarefaGroup(tipo, tarefasList)
                )}
              </div>
            ) : (
              tarefasOrdenadas.map((tarefa, index) => renderTarefa(tarefa, index))
            )}
          </div>
          
          {/* Rodapé */}
          <div className="mt-8 pt-6 border-t-2 border-gray-300">
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <p className="mb-2">Saída (km leitura): _____________</p>
                <p className="mb-2">Retorno (km leitura): _____________</p>
              </div>
              <div>
                <p className="mb-2">Assinatura Motorista: _________________________</p>
                <p className="mb-2">Hora: ____:____</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2">Observações Gerais:</p>
              <div className="border border-gray-300 h-12"></div>
            </div>
            
            <div className="mt-6 text-xs text-gray-500 text-center">
              ERP LocaAção · {loja} · {formatDate(data)} · 
              {motorista && ` Motorista ${motorista.nome} ·`} Página 1/1
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ItineraryPrint.displayName = "ItineraryPrint";