import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSupabaseSolicitacoes } from '@/hooks/useSupabaseSolicitacoes';
import { SolicitacaoTimeline } from './SolicitacaoTimeline';
import { SolicitacaoAnexos } from './SolicitacaoAnexos';
import { SolicitacaoAcoes } from './SolicitacaoAcoes';
import { SolicitacaoLaudo } from './SolicitacaoLaudo';
import {
  getStatusLabel,
  getStatusColor,
  getPrioridadeColor,
  calcularSLARestante,
} from '@/types/solicitacao-manutencao';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, FileText, Loader2 } from 'lucide-react';

interface SolicitacaoDetalheProps {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
}

export function SolicitacaoDetalhe({ open, onClose, solicitacaoId }: SolicitacaoDetalheProps) {
  const { useSolicitacao } = useSupabaseSolicitacoes();
  const { data: solicitacao, isLoading } = useSolicitacao(solicitacaoId);
  const [activeTab, setActiveTab] = useState('timeline');

  if (!solicitacao) {
    return null;
  }

  const sla = calcularSLARestante(solicitacao);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{solicitacao.cliente_nome}</DialogTitle>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  Criado em {format(new Date(solicitacao.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge className={getPrioridadeColor(solicitacao.prioridade)}>
                {solicitacao.prioridade}
              </Badge>
              <Badge className={getStatusColor(solicitacao.status)}>
                {getStatusLabel(solicitacao.status)}
              </Badge>
              {solicitacao.sla_horas && (
                <div className={`flex items-center gap-1 text-sm font-semibold ${sla.vencido ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <Clock className="h-4 w-4" />
                  {sla.vencido ? 'SLA VENCIDO' : `${sla.horas}h ${sla.minutos}m`}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="anexos">Anexos ({solicitacao.anexos?.length || 0})</TabsTrigger>
                <TabsTrigger value="laudo">Laudo</TabsTrigger>
                <TabsTrigger value="acoes">Ações</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto mt-4">
                <TabsContent value="timeline" className="mt-0">
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Sintomas Relatados
                      </h3>
                      <p className="text-sm">{solicitacao.sintomas}</p>
                    </div>
                    <SolicitacaoTimeline timeline={solicitacao.timeline || []} />
                  </div>
                </TabsContent>

                <TabsContent value="anexos" className="mt-0">
                  <SolicitacaoAnexos
                    solicitacaoId={solicitacao.id}
                    anexos={solicitacao.anexos || []}
                  />
                </TabsContent>

                <TabsContent value="laudo" className="mt-0">
                  <SolicitacaoLaudo
                    solicitacaoId={solicitacao.id}
                    laudo={solicitacao.laudo}
                  />
                </TabsContent>

                <TabsContent value="acoes" className="mt-0">
                  <SolicitacaoAcoes
                    solicitacao={solicitacao}
                    onUpdate={onClose}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
