import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Download, 
  Building
} from 'lucide-react';
import { format } from 'date-fns';
import { useFinanceiroStore } from '@/stores/financeiroStore';
import { getAccountBalancesSelector } from '@/services/account-balances/AccountBalancesSelector';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { useToast } from '@/hooks/use-toast';

export function SaldosTab() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { toast } = useToast();
  const { lojaAtual } = useMultiunidade();
  
  // Usar o selector para calcular saldos
  const selector = getAccountBalancesSelector();
  const saldosData = selector.getAccountBalances(
    { from: selectedDate, to: selectedDate },
    { lojaId: lojaAtual?.id }
  );

  const handleExportSaldos = () => {
    try {
      // Headers do CSV
      const headers = [
        'DataRef', 'Loja', 'ContaCodigo', 'ContaNome', 'Banco', 
        'Agencia', 'Numero', 'Moeda', 'SaldoInicial', 'Creditos', 
        'Debitos', 'SaldoFinal', 'SaldoDisponivel', 'ConciliadoAte'
      ];

      // Converter dados para CSV
      const rows = saldosData.contas.map(conta => [
        saldosData.dataRef,
        lojaAtual?.nome || 'N/A',
        conta.contaCodigo,
        conta.contaNome,
        conta.banco || '',
        conta.agencia || '',
        conta.numero || '',
        conta.moeda,
        conta.opening.toFixed(2).replace('.', ','),
        conta.credits.toFixed(2).replace('.', ','),
        conta.debits.toFixed(2).replace('.', ','),
        conta.closing.toFixed(2).replace('.', ','),
        conta.available.toFixed(2).replace('.', ','),
        conta.conciliadoAte || '',
      ]);

      // Criar conteúdo CSV
      const csvContent = [
        '\ufeff', // BOM UTF-8
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `saldos_${selectedDate.replace(/-/g, '')}_${lojaAtual?.id || 'loja'}.csv`;
      link.click();

      toast({
        title: "Export concluído",
        description: "Arquivo de saldos exportado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao exportar saldos:', error);
      toast({
        title: "Erro no export",
        description: "Não foi possível exportar os saldos.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Saldos das Contas</h3>
          <p className="text-sm text-muted-foreground">
            Posição em {format(new Date(selectedDate), 'dd/MM/yyyy')} - {lojaAtual?.nome}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Data de referência:</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={handleExportSaldos} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{saldosData.contas.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {saldosData.contas.reduce((sum, c) => sum + c.closing, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponível</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {saldosData.contas.reduce((sum, c) => sum + c.available, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bloqueios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {saldosData.contas.reduce((sum, c) => sum + (c.bloqueios || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contas por Saldo</CardTitle>
        </CardHeader>
        <CardContent>
          {saldosData.contas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conta encontrada para esta loja</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead className="text-right">Saldo Inicial</TableHead>
                  <TableHead className="text-right">Créditos</TableHead>
                  <TableHead className="text-right">Débitos</TableHead>
                  <TableHead className="text-right">Saldo Final</TableHead>
                  <TableHead className="text-right">Disponível</TableHead>
                  <TableHead>Conciliado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saldosData.contas.map((conta) => (
                  <TableRow key={conta.contaId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{conta.contaNome}</div>
                        <div className="text-sm text-muted-foreground">{conta.contaCodigo}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{conta.banco}</div>
                        {conta.agencia && conta.numero && (
                          <div className="text-muted-foreground">
                            Ag: {conta.agencia} Cc: {conta.numero}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {conta.opening.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      R$ {conta.credits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      R$ {conta.debits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {conta.closing.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={conta.available < 0 ? 'text-red-600' : 'text-green-600'}>
                        R$ {conta.available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {conta.conciliadoAte ? (
                        <Badge variant="default" className="text-xs">
                          {format(new Date(conta.conciliadoAte), 'dd/MM/yyyy')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Não conciliado
                        </Badge>
                      )}
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