import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Wallet, Settings } from 'lucide-react';
import { useRbac } from '@/hooks/useRbac';
import { SaldosTab } from '@/components/financeiro/SaldosTab';
import { TransferenciasTab } from '@/components/financeiro/TransferenciasTab';
import { ConciliacaoTab } from '@/components/financeiro/ConciliacaoTab';
import { guardRoute } from '@/hooks/useRbac';

function FinanceiroTransferenciasPage() {
  const { can } = useRbac();

  const hasTransferAccess = can('fin:transferir');
  const hasConciliacaoAccess = can('fin:conciliar');
  const hasSaldosAccess = can('fin:ver-saldos');

  if (!hasTransferAccess && !hasConciliacaoAccess && !hasSaldosAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Você não tem permissão para acessar o módulo Financeiro.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-primary" />
                Módulo Financeiro
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestão de contas, transferências e conciliação bancária
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Mock/Demo
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue="saldos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            {hasSaldosAccess && (
              <TabsTrigger value="saldos" className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Contas & Saldos</span>
                <span className="sm:hidden">Saldos</span>
              </TabsTrigger>
            )}
            {hasTransferAccess && (
              <TabsTrigger value="transferencias" className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Transferências</span>
                <span className="sm:hidden">Transfer.</span>
              </TabsTrigger>
            )}
            {hasConciliacaoAccess && (
              <TabsTrigger value="conciliacao" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Conciliação</span>
                <span className="sm:hidden">Conc.</span>
              </TabsTrigger>
            )}
          </TabsList>

          {hasSaldosAccess && (
            <TabsContent value="saldos">
              <SaldosTab />
            </TabsContent>
          )}

          {hasTransferAccess && (
            <TabsContent value="transferencias">
              <TransferenciasTab />
            </TabsContent>
          )}

          {hasConciliacaoAccess && (
            <TabsContent value="conciliacao">
              <ConciliacaoTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

// Aplicar guard de permissões
export default guardRoute(['fin:transferir', 'fin:conciliar', 'fin:ver-saldos'])(FinanceiroTransferenciasPage);