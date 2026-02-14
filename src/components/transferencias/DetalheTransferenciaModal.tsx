import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTransferenciasStore } from "@/stores/transferenciasStore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, Truck, FileText, MapPin } from "lucide-react";

interface DetalheTransferenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferenciaId: string | null;
}

const statusConfig = {
  'CRIADA': { label: 'Criada', color: 'bg-blue-500' },
  'EM_TRANSITO': { label: 'Em Trânsito', color: 'bg-orange-500' },
  'RECEBIDA': { label: 'Recebida', color: 'bg-green-500' },
  'RECUSADA': { label: 'Recusada', color: 'bg-red-500' },
  'CANCELADA': { label: 'Cancelada', color: 'bg-gray-500' }
};

export function DetalheTransferenciaModal({ 
  open, 
  onOpenChange, 
  transferenciaId 
}: DetalheTransferenciaModalProps) {
  const { transferencias } = useTransferenciasStore();
  
  const transferencia = transferenciaId 
    ? transferencias.find(t => t.id === transferenciaId)
    : null;

  if (!transferencia) {
    return null;
  }

  const statusInfo = statusConfig[transferencia.status];

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
                  <p className="font-medium">{transferencia.origemLojaNome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Destino</label>
                  <p className="font-medium">{transferencia.destinoLojaNome}</p>
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
                  <p>{format(new Date(transferencia.criadoEm), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Atualizado em</label>
                  <p>{format(new Date(transferencia.atualizadoEm), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}</p>
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
                {transferencia.itens.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={item.tipo === 'SERIAL' ? 'default' : 'secondary'}>
                        {item.tipo}
                      </Badge>
                      <div>
                        <p className="font-medium">
                          {item.codigoInterno || item.descricao}
                        </p>
                        {item.serie && (
                          <p className="text-sm text-muted-foreground">
                            Série: {item.serie}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {item.descricao}
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
          {transferencia.recusa && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Motivo da Recusa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Motivo</label>
                    <p className="font-medium">
                      {transferencia.recusa.motivo === 'NUMERACAO' && 'Numeração divergente'}
                      {transferencia.recusa.motivo === 'DANO' && 'Item danificado'}
                      {transferencia.recusa.motivo === 'DESTINO' && 'Destino incorreto'}
                      {transferencia.recusa.motivo === 'OUTRO' && 'Outro motivo'}
                    </p>
                  </div>
                  
                  {transferencia.recusa.detalhe && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Detalhes</label>
                      <p className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                        {transferencia.recusa.detalhe}
                      </p>
                    </div>
                  )}
                  
                  {transferencia.recusa.porUsuarioNome && transferencia.recusa.em && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Recusado por</label>
                      <p>
                        {transferencia.recusa.porUsuarioNome} em{' '}
                        {format(new Date(transferencia.recusa.em), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
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
                {transferencia.logs.map((log, index) => (
                  <div key={index} className="flex gap-3">
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
                          {format(new Date(log.em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm">
                        <User className="h-3 w-3 inline mr-1" />
                        {log.porUsuarioNome}
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