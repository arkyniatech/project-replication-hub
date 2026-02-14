import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowRightLeft, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  Undo2
} from 'lucide-react';
import { format } from 'date-fns';
import { getAccountBalancesSelector } from '@/services/account-balances/AccountBalancesSelector';
import { toast } from 'sonner';
import { useFinanceiroStore } from '@/stores/financeiroStore';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { NovaTransferenciaModal } from './NovaTransferenciaModal';
import type { Transfer } from '@/types/financeiro';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

type StatusFilter = 'all' | 'PENDENTE' | 'EFETIVADA' | 'CANCELADA';

function getStatusBadge(status: Transfer['status']) {
  switch (status) {
    case 'EFETIVADA':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Efetivada</Badge>;
    case 'PENDENTE':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    case 'CANCELADA':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" />Cancelada</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function TransferenciasTab() {
  const { lojaAtual } = useMultiunidade();
  const { 
    getTransfersByLoja, 
    getContasByLoja,
    efetivarTransfer,
    cancelarTransfer,
    estornarTransfer
  } = useFinanceiroStore();

  const [showNovaTransferencia, setShowNovaTransferencia] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periodoFilter, setPeriodoFilter] = useState('30d');

  const lojaId = lojaAtual?.id || '1';
  const transferencias = getTransfersByLoja(lojaId);
  const contas = getContasByLoja(lojaId);

  const getContaName = (contaId: string) => {
    const conta = contas.find(c => c.id === contaId);
    return conta ? `${conta.nome} (${conta.banco})` : contaId;
  };

  const filteredTransferencias = useMemo(() => {
    let filtered = transferencias;

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Filtro por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        getContaName(t.origemId).toLowerCase().includes(term) ||
        getContaName(t.destinoId).toLowerCase().includes(term) ||
        t.descricao?.toLowerCase().includes(term) ||
        t.ref?.toLowerCase().includes(term)
      );
    }

    // Filtro por período
    const now = new Date();
    const daysBack = periodoFilter === '7d' ? 7 : periodoFilter === '30d' ? 30 : 90;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    filtered = filtered.filter(t => new Date(t.data) >= startDate);

    return filtered.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [transferencias, statusFilter, searchTerm, periodoFilter, contas]);

  const handleEfetivar = (transferId: string) => {
    efetivarTransfer(transferId);
    toast.success('Transferência efetivada com sucesso!');
  };

  const handleCancelar = (transferId: string) => {
    cancelarTransfer(transferId);
    toast.success('Transferência cancelada');
  };

  const handleEstornar = (transferId: string) => {
    const motivo = prompt('Motivo do estorno:');
    if (motivo) {
      estornarTransfer(transferId, motivo);
      toast.success('Estorno processado com sucesso!');
    }
  };

  const handleExportCSV = () => {
    // Mock CSV export
    const csvData = filteredTransferencias.map(t => [
      format(new Date(t.data), 'dd/MM/yyyy'),
      getContaName(t.origemId),
      getContaName(t.destinoId),
      t.valor.toLocaleString('pt-BR'),
      (t.taxa || 0).toLocaleString('pt-BR'),
      t.status,
      t.descricao || '',
      t.ref || ''
    ]);

    const csv = [
      ['Data', 'Origem', 'Destino', 'Valor', 'Taxa', 'Status', 'Descrição', 'Referência'],
      ...csvData
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transferencias_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('CSV exportado com sucesso!');
  };

  // KPIs
  const totalEfetivadas = transferencias.filter(t => t.status === 'EFETIVADA').length;
  const totalPendentes = transferencias.filter(t => t.status === 'PENDENTE').length;
  const valorTotalMes = transferencias
    .filter(t => {
      const data = new Date(t.data);
      const agora = new Date();
      return data.getMonth() === agora.getMonth() && 
             data.getFullYear() === agora.getFullYear() &&
             t.status === 'EFETIVADA';
    })
    .reduce((sum, t) => sum + t.valor, 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efetivadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEfetivadas}</div>
            <p className="text-xs text-muted-foreground">Total de transferências</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPendentes}</div>
            <p className="text-xs text-muted-foreground">Aguardando efetivação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume do Mês</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {valorTotalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Valor total efetivado</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transferências..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="PENDENTE">Pendentes</SelectItem>
              <SelectItem value="EFETIVADA">Efetivadas</SelectItem>
              <SelectItem value="CANCELADA">Canceladas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button onClick={() => setShowNovaTransferencia(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Transferência
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Transferências ({filteredTransferencias.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransferencias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma transferência encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransferencias.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>{format(new Date(transfer.data), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <div className="max-w-48 truncate" title={getContaName(transfer.origemId)}>
                          {getContaName(transfer.origemId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-48 truncate" title={getContaName(transfer.destinoId)}>
                          {getContaName(transfer.destinoId)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {transfer.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {(transfer.taxa || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        <div className="max-w-48 truncate" title={transfer.descricao}>
                          {transfer.descricao || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {transfer.status === 'PENDENTE' && (
                              <>
                                <DropdownMenuItem onClick={() => handleEfetivar(transfer.id)}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Efetivar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCancelar(transfer.id)}>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Cancelar
                                </DropdownMenuItem>
                              </>
                            )}
                            {transfer.status === 'EFETIVADA' && (
                              <DropdownMenuItem onClick={() => handleEstornar(transfer.id)}>
                                <Undo2 className="w-4 h-4 mr-2" />
                                Estornar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setSelectedTransfer(transfer)}>
                              Ver Detalhes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Nova Transferência */}
      <NovaTransferenciaModal
        open={showNovaTransferencia}
        onOpenChange={setShowNovaTransferencia}
        onSuccess={() => {
          // Refresh será automático através do store
        }}
      />

      {/* Modal Detalhes (placeholder) */}
      {selectedTransfer && (
        <Dialog open={!!selectedTransfer} onOpenChange={() => setSelectedTransfer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes da Transferência</DialogTitle>
              <DialogDescription>
                Transferência #{selectedTransfer.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Data:</span>
                  <p>{format(new Date(selectedTransfer.data), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedTransfer.status)}</div>
                </div>
                <div>
                  <span className="font-medium">Origem:</span>
                  <p>{getContaName(selectedTransfer.origemId)}</p>
                </div>
                <div>
                  <span className="font-medium">Destino:</span>
                  <p>{getContaName(selectedTransfer.destinoId)}</p>
                </div>
                <div>
                  <span className="font-medium">Valor:</span>
                  <p className="font-mono">R$ {selectedTransfer.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <span className="font-medium">Taxa:</span>
                  <p className="font-mono">R$ {(selectedTransfer.taxa || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                {selectedTransfer.ref && (
                  <div className="col-span-2">
                    <span className="font-medium">Referência:</span>
                    <p>{selectedTransfer.ref}</p>
                  </div>
                )}
                {selectedTransfer.descricao && (
                  <div className="col-span-2">
                    <span className="font-medium">Descrição:</span>
                    <p>{selectedTransfer.descricao}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}