import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  User,
  ArrowRightLeft,
  Send,
  CheckCircle2,
  XCircle,
  Settings,
  DollarSign,
  Package,
  AlertTriangle,
  TruckIcon,
  Building2,
  Hash,
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TimelineEventEquipamento } from '@/types/equipamentos';
import { useNavigate } from 'react-router-dom';

interface TimelineEventDetailsProps {
  event: TimelineEventEquipamento;
  isRecent?: boolean;
}

export function TimelineEventDetails({ event, isRecent }: TimelineEventDetailsProps) {
  const navigate = useNavigate();

  const getEventIcon = () => {
    switch (event.tipo) {
      case 'TRANSFERENCIA_ENVIADA':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'TRANSFERENCIA_RECEBIDA':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'TRANSFERENCIA_RECUSADA':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'ALTERACAO_STATUS':
        return <Settings className="h-4 w-4 text-orange-500" />;
      case 'ALTERACAO_PRECO':
        return <DollarSign className="h-4 w-4 text-purple-500" />;
      case 'CRIACAO':
        return <Package className="h-4 w-4 text-primary" />;
      case 'INATIVACAO':
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      case 'CONTRATO_CRIADO':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'CONTRATO_RENOVADO':
        return <Wrench className="h-4 w-4 text-green-600" />;
      case 'CONTRATO_DEVOLVIDO':
        return <CheckCircle2 className="h-4 w-4 text-orange-600" />;
      case 'CONTRATO_SUBSTITUIDO':
        return <ArrowRightLeft className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventColor = () => {
    switch (event.tipo) {
      case 'TRANSFERENCIA_ENVIADA':
        return 'bg-blue-50 border-blue-200';
      case 'TRANSFERENCIA_RECEBIDA':
        return 'bg-green-50 border-green-200';
      case 'TRANSFERENCIA_RECUSADA':
        return 'bg-red-50 border-red-200';
      case 'ALTERACAO_STATUS':
        return 'bg-orange-50 border-orange-200';
      case 'ALTERACAO_PRECO':
        return 'bg-purple-50 border-purple-200';
      case 'CRIACAO':
        return 'bg-primary/5 border-primary/20';
      case 'INATIVACAO':
        return 'bg-gray-50 border-gray-200';
      case 'CONTRATO_CRIADO':
        return 'bg-blue-50 border-blue-200';
      case 'CONTRATO_RENOVADO':
        return 'bg-green-50 border-green-200';
      case 'CONTRATO_DEVOLVIDO':
        return 'bg-orange-50 border-orange-200';
      case 'CONTRATO_SUBSTITUIDO':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-muted/30 border-border';
    }
  };

  const renderTransferenciaEnviada = () => {
    if (!event.meta) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {event.meta.quantidade && (
          <div className="flex items-center gap-2 text-sm">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Quantidade:</span>
            <span className="font-semibold">{event.meta.quantidade}</span>
          </div>
        )}
        
        {event.meta.origemLojaNome && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Origem:</span>
            <span className="font-medium">{event.meta.origemLojaNome}</span>
          </div>
        )}
        
        {event.meta.destinoLojaNome && (
          <div className="flex items-center gap-2 text-sm">
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Destino:</span>
            <span className="font-medium">{event.meta.destinoLojaNome}</span>
          </div>
        )}
        
        {event.meta.transferenciaNumero && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Transferência:</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 font-semibold"
              onClick={() => navigate(`/equipamentos/transferencias?id=${event.meta?.transferenciaId}`)}
            >
              #{event.meta.transferenciaNumero}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderTransferenciaRecebida = () => {
    if (!event.meta) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {event.meta.quantidade && (
          <div className="flex items-center gap-2 text-sm">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Quantidade:</span>
            <span className="font-semibold">{event.meta.quantidade}</span>
          </div>
        )}
        
        {event.meta.origemLojaNome && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Origem:</span>
            <span className="font-medium">{event.meta.origemLojaNome}</span>
          </div>
        )}
        
        {event.meta.destinoLojaNome && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Recebido em:</span>
            <span className="font-medium">{event.meta.destinoLojaNome}</span>
          </div>
        )}
        
        {event.meta.tempoTransito && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Tempo em trânsito:</span>
            <span className="font-medium">
              {event.meta.tempoTransito < 60 
                ? `${event.meta.tempoTransito} min`
                : `${Math.floor(event.meta.tempoTransito / 60)}h ${event.meta.tempoTransito % 60}min`
              }
            </span>
          </div>
        )}
        
        {event.meta.transferenciaNumero && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Transferência:</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 font-semibold"
              onClick={() => navigate(`/equipamentos/transferencias?id=${event.meta?.transferenciaId}`)}
            >
              #{event.meta.transferenciaNumero}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderTransferenciaRecusada = () => {
    if (!event.meta) return null;
    
    return (
      <div className="space-y-3 mt-3">
        {event.meta.motivoRecusa && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <span className="font-medium text-red-800">Motivo:</span>
                <span className="text-red-700 ml-2">{event.meta.motivoRecusa.tipo}</span>
                {event.meta.motivoRecusa.detalhe && (
                  <p className="text-red-600 text-xs mt-1">{event.meta.motivoRecusa.detalhe}</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {event.meta.quantidade && (
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Quantidade:</span>
              <span className="font-semibold">{event.meta.quantidade}</span>
            </div>
          )}
          
          {event.meta.origemLojaNome && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Origem:</span>
              <span className="font-medium">{event.meta.origemLojaNome}</span>
            </div>
          )}
          
          {event.meta.destinoLojaNome && (
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Destino:</span>
              <span className="font-medium">{event.meta.destinoLojaNome}</span>
            </div>
          )}
          
          {event.meta.transferenciaNumero && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Transferência:</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 font-semibold"
                onClick={() => navigate(`/equipamentos/transferencias?id=${event.meta?.transferenciaId}`)}
              >
                #{event.meta.transferenciaNumero}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAlteracaoStatus = () => {
    if (!event.meta) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {event.meta.statusAnterior && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status Anterior:</span>
            <Badge variant="outline">{event.meta.statusAnterior}</Badge>
          </div>
        )}
        
        {event.meta.statusNovo && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Novo Status:</span>
            <Badge variant="default">{event.meta.statusNovo}</Badge>
          </div>
        )}
        
        {event.meta.motivoAlteracao && (
          <div className="md:col-span-2 text-sm">
            <span className="text-muted-foreground">Motivo:</span>
            <span className="ml-2 italic">{event.meta.motivoAlteracao}</span>
          </div>
        )}
        
        {event.meta.contratoNumero && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Contrato:</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 font-semibold"
              onClick={() => navigate(`/contratos/${event.meta?.contratoId}`)}
            >
              {event.meta.contratoNumero}
            </Button>
          </div>
        )}
        
        {event.meta.osId && (
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">OS:</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 font-semibold"
              onClick={() => navigate(`/manutencao/os/${event.meta?.osId}`)}
            >
              Ver OS
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderAlteracaoPreco = () => {
    if (!event.meta) return null;
    
    const variacao = event.meta.percentualVariacao || 0;
    const isAumento = variacao > 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {event.meta.periodo && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Período:</span>
            <Badge variant="outline">{event.meta.periodo}</Badge>
          </div>
        )}
        
        {event.meta.lojaNome && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Loja:</span>
            <span className="font-medium">{event.meta.lojaNome}</span>
          </div>
        )}
        
        {event.meta.valorAnterior !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Valor Anterior:</span>
            <span className="font-mono line-through text-muted-foreground">
              R$ {event.meta.valorAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        
        {event.meta.valorNovo !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Novo Valor:</span>
            <span className="font-mono font-semibold text-green-600">
              R$ {event.meta.valorNovo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        
        {variacao !== 0 && (
          <div className="md:col-span-2 flex items-center gap-2 text-sm">
            {isAumento ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
            <span className="text-muted-foreground">Variação:</span>
            <span className={`font-semibold ${isAumento ? 'text-red-600' : 'text-green-600'}`}>
              {isAumento ? '+' : ''}{variacao.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderCriacao = () => {
    if (!event.meta) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {event.meta.quantidadeInicial && (
          <div className="flex items-center gap-2 text-sm">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Quantidade Inicial:</span>
            <span className="font-semibold">{event.meta.quantidadeInicial}</span>
          </div>
        )}
        
        {event.meta.lojaInicialNome && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Loja:</span>
            <span className="font-medium">{event.meta.lojaInicialNome}</span>
          </div>
        )}
        
        {event.meta.valorIndenizacao !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Valor de Indenização:</span>
            <span className="font-semibold">
              R$ {event.meta.valorIndenizacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderInativacao = () => {
    if (!event.meta) return null;
    
    return (
      <div className="space-y-3 mt-3">
        {event.meta.motivoInativacao && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <span className="font-medium text-yellow-800">Motivo:</span>
                <span className="text-yellow-700 ml-2">{event.meta.motivoInativacao}</span>
              </div>
            </div>
          </div>
        )}
        
        {event.meta.saldosFinais && Object.keys(event.meta.saldosFinais).length > 0 && (
          <div>
            <span className="text-sm text-muted-foreground mb-2 block">Saldos Finais por Loja:</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(event.meta.saldosFinais).map(([lojaId, qtd]) => (
                <div key={lojaId} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                  <span>{lojaId}</span>
                  <span className="font-medium">{qtd}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {event.meta.contratosAtivos && event.meta.contratosAtivos.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <span className="font-medium text-red-800">Atenção:</span>
                <span className="text-red-700 ml-2">
                  Havia {event.meta.contratosAtivos.length} contrato(s) ativo(s)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContratoCriado = () => {
    if (!event.meta) return null;
    return (
      <div className="space-y-2 mt-3">
        <p className="text-sm text-muted-foreground">{event.descricao}</p>
        {event.meta.contratoNumero && (
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto text-blue-600"
            onClick={() => navigate(`/contratos/${event.meta?.contratoId}`)}
          >
            Ver contrato {event.meta.contratoNumero} →
          </Button>
        )}
      </div>
    );
  };

  const renderContratoRenovado = () => {
    if (!event.meta) return null;
    return (
      <div className="space-y-2 mt-3">
        <p className="text-sm text-muted-foreground">{event.descricao}</p>
        {event.meta.valorRenovacao && (
          <p className="text-xs text-muted-foreground">
            Valor: R$ {Number(event.meta.valorRenovacao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}
        {event.meta.contratoNumero && (
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto text-green-600"
            onClick={() => navigate(`/contratos/${event.meta?.contratoId}`)}
          >
            Ver contrato {event.meta.contratoNumero} →
          </Button>
        )}
      </div>
    );
  };

  const renderContratoDevolvido = () => {
    if (!event.meta) return null;
    return (
      <div className="space-y-2 mt-3">
        <p className="text-sm text-muted-foreground">{event.descricao}</p>
        {event.meta.dataDevolucao && (
          <p className="text-xs text-muted-foreground">
            Data de devolução: {format(new Date(event.meta.dataDevolucao), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        )}
      </div>
    );
  };

  const renderEventDetails = () => {
    switch (event.tipo) {
      case 'TRANSFERENCIA_ENVIADA':
        return renderTransferenciaEnviada();
      case 'TRANSFERENCIA_RECEBIDA':
        return renderTransferenciaRecebida();
      case 'TRANSFERENCIA_RECUSADA':
        return renderTransferenciaRecusada();
      case 'ALTERACAO_STATUS':
        return renderAlteracaoStatus();
      case 'ALTERACAO_PRECO':
        return renderAlteracaoPreco();
      case 'CRIACAO':
        return renderCriacao();
      case 'INATIVACAO':
        return renderInativacao();
      case 'CONTRATO_CRIADO':
        return renderContratoCriado();
      case 'CONTRATO_RENOVADO':
        return renderContratoRenovado();
      case 'CONTRATO_DEVOLVIDO':
        return renderContratoDevolvido();
      case 'CONTRATO_SUBSTITUIDO':
        return (
          <div className="space-y-2 mt-3">
            <p className="text-sm text-muted-foreground">{event.descricao}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`relative p-4 border rounded-lg transition-all hover:shadow-md ${getEventColor()}`}>
      {isRecent && (
        <div className="absolute -top-2 -right-2">
          <Badge variant="default" className="text-xs">
            🔥 Recente
          </Badge>
        </div>
      )}
      
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-background shadow-sm flex items-center justify-center border">
            {getEventIcon()}
          </div>
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-semibold text-foreground">{event.descricao}</h4>
            <Badge variant="outline" className="text-xs shrink-0">
              {event.tipo.replace(/_/g, ' ')}
            </Badge>
          </div>
          
          {renderEventDetails()}
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>{event.usuario}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {(() => {
                  if (!event.timestamp) return 'Data não disponível';
                  const date = typeof event.timestamp === 'string' ? parseISO(event.timestamp) : new Date(event.timestamp);
                  return isValid(date) ? format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Data inválida';
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}