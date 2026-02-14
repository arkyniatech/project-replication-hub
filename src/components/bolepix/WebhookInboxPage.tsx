import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useBolePixStore } from '@/stores/bolePixStore';
import { 
  Webhook, 
  RefreshCw, 
  Search, 
  Download, 
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useRbac } from '@/hooks/useRbac';

export function WebhookInboxPage() {
  const { can } = useRbac();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  
  const {
    webhookEvents,
    reprocessWebhookEvent,
    markEventAsProcessed,
    clearWebhookEvents,
  } = useBolePixStore();
  
  const { toast } = useToast();

  // Check permissions
  if (!can('config:usuarios')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="text-6xl">🔒</div>
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground max-w-md">
          Esta área é disponível apenas para administradores.
        </p>
      </div>
    );
  }

  // Filter events
  const filteredEvents = webhookEvents.filter(event => {
    const matchesSearch = search === '' || 
      event.codigoSolicitacao.toLowerCase().includes(search.toLowerCase()) ||
      event.tipo.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'processado' && event.processado) ||
      (statusFilter === 'pendente' && !event.processado);
    
    const matchesTipo = tipoFilter === 'all' || event.tipo === tipoFilter;
    
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const handleReprocess = (eventId: string) => {
    reprocessWebhookEvent(eventId);
    toast({
      title: 'Evento reprocessado',
      description: 'O evento foi reenviado para processamento.',
    });
  };

  const handleMarkProcessed = (eventId: string) => {
    markEventAsProcessed(eventId);
    toast({
      title: 'Evento marcado como processado',
      description: 'O evento foi marcado como processado manualmente.',
    });
  };

  const handleClearAll = () => {
    clearWebhookEvents();
    toast({
      title: 'Inbox limpo',
      description: 'Todos os eventos foram removidos.',
    });
  };

  const handleExport = () => {
    const csv = [
      'ID,Tipo,CodigoSolicitacao,Status,DataEvento,Processado,Tentativas',
      ...filteredEvents.map(event => [
        event.id,
        event.tipo,
        event.codigoSolicitacao,
        event.status,
        event.dataEvento,
        event.processado ? 'Sim' : 'Não',
        event.tentativas
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webhooks_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusIcon = (event: any) => {
    if (event.processado) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (event.erro) return <XCircle className="h-4 w-4 text-red-600" />;
    if (event.tentativas > 0) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <Clock className="h-4 w-4 text-blue-600" />;
  };

  const getStatusBadge = (event: any) => {
    if (event.processado) return <Badge variant="default">Processado</Badge>;
    if (event.erro) return <Badge variant="destructive">Erro</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Webhook className="h-6 w-6" />
            Webhook Inbox - BolePix Inter
          </h1>
          <p className="text-muted-foreground">
            Eventos recebidos dos webhooks do Banco Inter (desenvolvimento)
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={handleClearAll}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Tudo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{webhookEvents.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Processados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {webhookEvents.filter(e => e.processado).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {webhookEvents.filter(e => !e.processado).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Com Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {webhookEvents.filter(e => e.erro).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por código ou tipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="processado">Processados</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="COBRANCA_EMITIDA">Cobrança Emitida</SelectItem>
                <SelectItem value="COBRANCA_PAGA">Cobrança Paga</SelectItem>
                <SelectItem value="COBRANCA_CANCELADA">Cobrança Cancelada</SelectItem>
                <SelectItem value="COBRANCA_EXPIRADA">Cobrança Expirada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eventos ({filteredEvents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum evento encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(event)}
                        {getStatusBadge(event)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{event.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{event.codigoSolicitacao}</code>
                    </TableCell>
                    <TableCell>
                      {new Date(event.dataEvento).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <span className={event.tentativas > 3 ? 'text-red-600' : 'text-muted-foreground'}>
                        {event.tentativas}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!event.processado && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReprocess(event.id)}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkProcessed(event.id)}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}