import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  TrendingUp,
  FileText,
  ExternalLink
} from 'lucide-react';
import { ItemUtilizacao } from '@/stores/relatorioUtilizacaoStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DetalhamentoModalProps {
  item: ItemUtilizacao;
  onClose: () => void;
}

export function DetalhamentoModal({ item, onClose }: DetalhamentoModalProps) {
  const formatMoney = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LOCADO': return 'bg-amber-500';
      case 'REVISAO': return 'bg-rose-500';
      case 'DISPONIVEL': return 'bg-emerald-500';
      default: return 'bg-gray-400';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'LOCADO': return 'Locado';
      case 'REVISAO': return 'Em Revisão';
      case 'DISPONIVEL': return 'Disponível';
      default: return status;
    }
  };
  
  // Organizar calendário por semanas
  const organizarCalendario = () => {
    if (item.statusCalendario.length === 0) return [];
    
    const primeiroDia = new Date(item.statusCalendario[0].data);
    const ultimoDia = new Date(item.statusCalendario[item.statusCalendario.length - 1].data);
    
    const todosDias = eachDayOfInterval({ start: primeiroDia, end: ultimoDia });
    const semanas: Date[][] = [];
    
    for (let i = 0; i < todosDias.length; i += 7) {
      semanas.push(todosDias.slice(i, i + 7));
    }
    
    return semanas;
  };
  
  const semanas = organizarCalendario();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Detalhamento: {item.codigo}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-4 h-4 text-primary mr-2" />
                </div>
                <div className="text-lg font-bold text-foreground">
                  {formatPercent(item.utilizacaoPercent)}
                </div>
                <div className="text-xs text-muted-foreground">Utilização</div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4 text-amber-600 mr-2" />
                </div>
                <div className="text-lg font-bold text-foreground">
                  {item.diasLocados}
                </div>
                <div className="text-xs text-muted-foreground">Dias Locados</div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="w-4 h-4 text-green-600 mr-2" />
                </div>
                <div className="text-lg font-bold text-foreground">
                  {item.diasDisponiveis}
                </div>
                <div className="text-xs text-muted-foreground">Disponíveis</div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="w-4 h-4 text-emerald-600 mr-2" />
                </div>
                <div className="text-lg font-bold text-foreground">
                  {formatMoney(item.receitaEstimada)}
                </div>
                <div className="text-xs text-muted-foreground">Receita</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Calendário de Status */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Calendário do Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              {semanas.length > 0 && (
                <div className="space-y-2">
                  {/* Headers dos dias */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                      <div key={dia} className="text-center text-xs font-medium text-muted-foreground p-1">
                        {dia}
                      </div>
                    ))}
                  </div>
                  
                  {/* Semanas */}
                  {semanas.map((semana, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-1">
                      {semana.map((dia, dayIndex) => {
                        const dataStr = format(dia, 'yyyy-MM-dd');
                        const statusDia = item.statusCalendario.find(s => s.data === dataStr);
                        const status = statusDia?.status || 'DISPONIVEL';
                        
                        return (
                          <div
                            key={dayIndex}
                            className={`
                              w-8 h-8 rounded text-white text-xs font-medium
                              flex items-center justify-center
                              ${getStatusColor(status)}
                            `}
                            title={`${format(dia, 'dd/MM/yyyy')} - ${getStatusLabel(status)}`}
                          >
                            {format(dia, 'd')}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  
                  {/* Legenda */}
                  <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-amber-500"></div>
                      <span className="text-xs">Locado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-rose-500"></div>
                      <span className="text-xs">Em Revisão</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-emerald-500"></div>
                      <span className="text-xs">Disponível</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Contratos */}
          {item.contratos.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Contratos no Período ({item.contratos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {item.contratos.map((contrato, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{contrato.numero}</div>
                        <div className="text-sm text-muted-foreground">{contrato.cliente}</div>
                        <div className="text-xs text-muted-foreground">
                          {contrato.inicio} até {contrato.fim}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Informações Técnicas */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Informações Técnicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Tipo de Controle:</span>
                  <Badge variant="outline" className="ml-2">{item.tipo}</Badge>
                </div>
                <div>
                  <span className="font-medium">Quantidade:</span>
                  <span className="ml-2">{item.quantidade}</span>
                </div>
                <div>
                  <span className="font-medium">Loja:</span>
                  <span className="ml-2">{item.lojaNome}</span>
                </div>
                <div>
                  <span className="font-medium">Dias do Período:</span>
                  <span className="ml-2">{item.diasPeriodo}</span>
                </div>
                <div>
                  <span className="font-medium">Capacidade Total:</span>
                  <span className="ml-2">{item.diasPeriodo * item.quantidade} dias</span>
                </div>
                <div>
                  <span className="font-medium">Dias em Manutenção:</span>
                  <span className="ml-2">{item.diasManutencao}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}