import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, FileText, Wrench, AlertTriangle } from 'lucide-react';
import type { SolicitacaoTimeline as TimelineType } from '@/types/solicitacao-manutencao';

interface SolicitacaoTimelineProps {
  timeline: TimelineType[];
}

const getIconForAcao = (acao: string) => {
  switch (acao) {
    case 'CRIADA':
      return <FileText className="h-4 w-4" />;
    case 'STATUS_MUDOU':
      return <Clock className="h-4 w-4" />;
    case 'LAUDO_REGISTRADO':
      return <AlertTriangle className="h-4 w-4" />;
    case 'OS_CRIADA':
    case 'SUBSTITUICAO_APLICADA':
      return <Wrench className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
};

const getLabelForAcao = (acao: string, payload?: any) => {
  switch (acao) {
    case 'CRIADA':
      return 'Solicitação criada';
    case 'STATUS_MUDOU':
      return `Status alterado: ${payload?.de} → ${payload?.para}`;
    case 'LAUDO_REGISTRADO':
      return `Laudo registrado (${payload?.tipo})`;
    case 'OS_CRIADA':
      return `OS criada: ${payload?.os_id}`;
    case 'SUBSTITUICAO_APLICADA':
      return 'Substituição aplicada';
    default:
      return acao;
  }
};

export function SolicitacaoTimeline({ timeline }: SolicitacaoTimelineProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Clock className="h-12 w-12 mb-2 opacity-50" />
        <p>Nenhum evento registrado ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeline.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              {getIconForAcao(event.acao)}
            </div>
            {index < timeline.length - 1 && (
              <div className="w-px flex-1 bg-border mt-2" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{getLabelForAcao(event.acao, event.payload)}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.ts), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            {event.payload && typeof event.payload === 'object' && (
              <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs font-mono">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
