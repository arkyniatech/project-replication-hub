import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseTransferencias } from "@/hooks/useSupabaseTransferencias";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, FileText, MapPin } from "lucide-react";

interface DetalheTransferenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferenciaId: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  'CRIADA': { label: 'Criada', color: 'bg-blue-500' },
  'EM_TRANSITO': { label: 'Em Trânsito', color: 'bg-orange-500' },
  'RECEBIDA': { label: 'Recebida', color: 'bg-green-500' },
  'RECUSADA': { label: 'Recusada', color: 'bg-red-500' },
  'CANCELADA': { label: 'Cancelada', color: 'bg-gray-500' }
};

const MOTIVO_RECUSA_LABEL: Record<string, string> = {
  NUMERACAO: 'Numeração divergente',
  DANO: 'Item danificado',
  DESTINO: 'Destino incorreto',
  OUTRO: 'Outro motivo',
};

export function DetalheTransferenciaModal({
  open,
  onOpenChange,
  transferenciaId
}: DetalheTransferenciaModalProps) {
  const { useTransferencia } = useSupabaseTransferencias();
  const { data: transferencia, isLoading, isError } = useTransferencia(transferenciaId ?? undefined);

  if (!open) return null;

  if (isError || (!isLoading && !transferencia)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Transferência</DialogTitle></DialogHeader>
          <p className="py-8 text-center text-muted-foreground">
            Não foi possível carregar esta transferência (pode ter sido excluída ou ser de outra loja).
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  if (isLoading || !transferencia) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Transferência</DialogTitle></DialogHeader>
          <Skeleton className="h-64 w-full" />
        </DialogContent>
      </Dialog>
    );
  }

  const statusInfo = statusConfig[transferencia.status] ?? { label: transferencia.status, color: 'bg-gray-500' };
  const recusa = transferencia.recusa as { motivo?: string; detalhe?: string; porUsuarioNome?: string; em?: string } | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Transferência #{transferencia.numero}
            <Badge className={`${statusInfo.color} text-white`}>
              {statusInfo.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Rota e Detalhes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Origem</label>
                  <p className="font-medium">{transferencia.origem?.nome ?? '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Destino</label>
                  <p className="font-medium">{transferencia.destino?.nome ?? '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Motorista</label>
                  <p>{transferencia.motorista || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Veículo</label>
                  <p>{transferencia.veiculo || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Criado em</label>
                  <p>{format(new Date(transferencia.created_at), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Atualizado em</label>
                  <p>{format(new Date(transferencia.updated_at), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}</p>
                </div>
              </div>

              {transferencia.observacoes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Observações</label>
                  <p className="mt-1 p-3 bg-muted rounded-md">{transferencia.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Itens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Itens ({transferencia.itens.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transferencia.itens.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={item.tipo === 'SERIAL' ? 'default' : 'secondary'}>
                        {item.tipo}
                      </Badge>
                      <div>
                        <p className="font-medium">
                          {item.codigo_interno || item.descricao || item.modelo?.nome_comercial || item.grupo?.nome || '—'}
                        </p>
                        {item.serie && (
                          <p className="text-sm text-muted-foreground">
                            Série: {item.serie}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {item.descricao || item.modelo?.nome_comercial || ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Qtd: {item.quantidade}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recusa */}
          {recusa && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Motivo da Recusa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Motivo</label>
                    <p className="font-medium">
                      {MOTIVO_RECUSA_LABEL[recusa.motivo ?? ''] ?? recusa.motivo ?? '—'}
                    </p>
                  </div>

                  {recusa.detalhe && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Detalhes</label>
                      <p className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                        {recusa.detalhe}
                      </p>
                    </div>
                  )}

                  {recusa.porUsuarioNome && recusa.em && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Recusado por</label>
                      <p>
                        {recusa.porUsuarioNome} em{' '}
                        {format(new Date(recusa.em), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transferencia.logs.map((log: any, index: number) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-primary rounded-full" />
                      {index < transferencia.logs.length - 1 && (
                        <div className="w-px h-8 bg-muted-foreground/30 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {log.acao}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm">
                        <User className="h-3 w-3 inline mr-1" />
                        {log.por_usuario_nome ?? '—'}
                      </p>
                      {log.detalhe && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.detalhe}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
