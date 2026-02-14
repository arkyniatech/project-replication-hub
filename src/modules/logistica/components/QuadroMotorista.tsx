import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ItinerarioDia, TarefaLogistica } from '../types';
import { Truck, MapPin, Phone, Clock } from 'lucide-react';

interface QuadroMotoristaProps {
  itinerario: ItinerarioDia;
  lojaNome?: string;
}

const QuadroMotorista = forwardRef<HTMLDivElement, QuadroMotoristaProps>(
  ({ itinerario, lojaNome = 'LocaAção Equipamentos' }, ref) => {
    const getTipoIcon = (tipo: string) => {
      switch (tipo) {
        case 'ENTREGA': return '📦';
        case 'RETIRADA': return '🔄';
        case 'SUPORTE': return '🔧';
        default: return '📋';
      }
    };

    const getStatusLabel = (status: string) => {
      const statusMap = {
        'PENDENTE': 'Pendente',
        'EM_ROTA': 'Em rota',
        'CONCLUIDA': 'Concluída',
        'REAGENDADA': 'Reagendada',
        'NAO_SAIDA': 'Não saiu',
        'NAO_ENTREGUE': 'Não entregue'
      };
      return statusMap[status as keyof typeof statusMap] || status;
    };

    const tarefasValidas = itinerario.tarefas.filter(t => 
      ['PENDENTE', 'EM_ROTA', 'CONCLUIDA'].includes(t.status)
    );

    return (
      <div ref={ref} className="bg-white p-6 font-sans text-sm print-page">
        {/* Cabeçalho */}
        <div className="border-b-2 border-primary pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-primary">{lojaNome}</h1>
              <p className="text-muted-foreground">Quadro Operacional do Motorista</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                {format(new Date(itinerario.dataISO), 'EEEE, dd/MM/yyyy', { locale: ptBR })}
              </p>
              <p className="text-muted-foreground text-xs">
                Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
          </div>
        </div>

        {/* Informações do Motorista e Veículo */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Motorista
            </h3>
            <div className="bg-muted/30 p-3 rounded">
              <p className="font-medium">{itinerario.motoristaInfo.nome}</p>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {itinerario.motoristaInfo.telefone}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-primary">Veículo</h3>
            <div className="bg-muted/30 p-3 rounded">
              <p className="font-medium">{itinerario.veiculoInfo.placa}</p>
              <p className="text-muted-foreground text-xs">{itinerario.veiculoInfo.modelo}</p>
            </div>
          </div>
        </div>

        {/* Resumo das Tarefas */}
        <div className="mb-6">
          <div className="bg-primary/5 p-3 rounded">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-semibold">{tarefasValidas.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entregas</p>
                <p className="font-semibold">
                  {tarefasValidas.filter(t => t.tipo === 'ENTREGA').length}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Retiradas</p>
                <p className="font-semibold">
                  {tarefasValidas.filter(t => t.tipo === 'RETIRADA').length}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assistências</p>
                <p className="font-semibold">
                  {tarefasValidas.filter(t => t.tipo === 'SUPORTE').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Tarefas */}
        <div className="mb-6">
          <h3 className="font-semibold text-primary mb-3">Agenda do Dia</h3>
          <table className="w-full border-collapse border border-muted">
            <thead>
              <tr className="bg-primary/10">
                <th className="border border-muted p-2 text-left text-xs font-semibold">Hora</th>
                <th className="border border-muted p-2 text-left text-xs font-semibold">Tipo</th>
                <th className="border border-muted p-2 text-left text-xs font-semibold">Contrato</th>
                <th className="border border-muted p-2 text-left text-xs font-semibold">Cliente</th>
                <th className="border border-muted p-2 text-left text-xs font-semibold">Endereço</th>
                <th className="border border-muted p-2 text-left text-xs font-semibold">Telefone</th>
                <th className="border border-muted p-2 text-left text-xs font-semibold">Status/Obs</th>
              </tr>
            </thead>
            <tbody>
              {tarefasValidas.map((tarefa, index) => (
                <tr key={tarefa.id} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                  <td className="border border-muted p-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {tarefa.janela.inicio}
                    </div>
                  </td>
                  <td className="border border-muted p-2 text-xs">
                    <span className="flex items-center gap-1">
                      {getTipoIcon(tarefa.tipo)}
                      {tarefa.tipo}
                    </span>
                  </td>
                  <td className="border border-muted p-2 text-xs font-medium">
                    {tarefa.contratoNumero}
                  </td>
                  <td className="border border-muted p-2 text-xs">
                    {tarefa.cliente.nome}
                  </td>
                  <td className="border border-muted p-2 text-xs">
                    <div className="flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="break-all">{tarefa.endereco}</span>
                    </div>
                  </td>
                  <td className="border border-muted p-2 text-xs">
                    {tarefa.telefone || '-'}
                  </td>
                  <td className="border border-muted p-2 text-xs">
                    <div>
                      <span className="font-medium">{getStatusLabel(tarefa.status)}</span>
                      {tarefa.observacoes && (
                        <div className="mt-1 text-muted-foreground text-xs">
                          {tarefa.observacoes}
                        </div>
                      )}
                      {tarefa.motivo && (
                        <div className="mt-1 text-destructive text-xs">
                          Motivo: {tarefa.motivo}
                        </div>
                      )}
                      <div className="mt-1 text-muted-foreground">
                        [ ] OK &nbsp;&nbsp; [ ] Problema
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {tarefasValidas.length === 0 && (
                <tr>
                  <td colSpan={7} className="border border-muted p-4 text-center text-muted-foreground">
                    Nenhuma tarefa programada para este dia
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé */}
        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-xs mb-2">Quilometragem</h4>
              <div className="flex gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Inicial:</span>
                  <span className="ml-2 border-b border-muted-foreground">_________</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Final:</span>
                  <span className="ml-2 border-b border-muted-foreground">_________</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-xs mb-2">Assinatura do Motorista</h4>
              <div className="border-b border-muted-foreground h-8"></div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-xs mb-2">Observações Gerais</h4>
            <div className="space-y-1">
              <div className="border-b border-muted-foreground"></div>
              <div className="border-b border-muted-foreground"></div>
              <div className="border-b border-muted-foreground"></div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground mt-4 pt-2 border-t">
            <p>⚠️ <strong>Lembrete de Segurança:</strong> Use sempre EPIs adequados, verifique condições do equipamento antes da entrega e siga protocolos de segurança.</p>
            <p className="mt-1">📱 Central de Operações: (11) 3000-0000 • Em caso de dúvidas ou emergências, entre em contato imediatamente.</p>
          </div>
        </div>

        <style>{`
          @media print {
            .print-page {
              page-break-after: always;
              margin: 0;
              padding: 20mm;
              font-size: 11pt;
            }
            @page {
              size: A4;
              margin: 12mm;
            }
          }
        `}</style>
      </div>
    );
  }
);

QuadroMotorista.displayName = 'QuadroMotorista';

export { QuadroMotorista };