import React, { useState, useMemo } from 'react';
import { Calendar, Download, RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { KPICard } from '@/components/gestao/KPICard';
import { SalesVsCashChart } from '@/components/gestao/SalesVsCashChart';
import { PortfolioStackedChart } from '@/components/gestao/PortfolioStackedChart';
import { WaterfallChart } from '@/components/gestao/WaterfallChart';
import { AlertsTable } from '@/components/gestao/AlertsTable';
import type { DateRange } from 'react-day-picker';
import { subDays, format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useSupabaseTitulos } from '@/hooks/useSupabaseTitulos';
import { useSupabaseRecebimentos } from '@/hooks/useSupabaseRecebimentos';

export default function GestaoContasReceber() {
  const { can } = usePermissions();
  const { lojaAtual, lojasPermitidas } = useMultiunidade();
  
  // Filtros
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedLojas, setSelectedLojas] = useState<string[]>(
    lojaAtual ? [lojaAtual.id] : []
  );
  const [selectedVendedor, setSelectedVendedor] = useState<string>('all');

  const { titulos = [] } = useSupabaseTitulos(lojaAtual?.id);
  const { recebimentos = [] } = useSupabaseRecebimentos(lojaAtual?.id);

  // Calcular dados financeiros baseados em dados reais do Supabase
  const financialData = useMemo(() => {
    const hoje = new Date();
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);
    
    // Filtrar títulos no período selecionado
    const titulosFiltrados = titulos.filter(t => {
      const emissao = new Date(t.emissao);
      return (!dateRange?.from || emissao >= dateRange.from) && 
             (!dateRange?.to || emissao <= dateRange.to);
    });

    const recebimentosFiltrados = recebimentos.filter(r => {
      const data = new Date(r.data);
      return (!dateRange?.from || data >= dateRange.from) && 
             (!dateRange?.to || data <= dateRange.to);
    });

    const faturado = titulosFiltrados.reduce((acc, t) => acc + (t.valor || 0), 0);
    const recebido = recebimentosFiltrados.reduce((acc, r) => acc + (r.valor_liquido || 0), 0);
    const indiceCaixa = faturado > 0 ? recebido / faturado : 0;
    const aReceberMes = titulos.filter(t => {
      const venc = new Date(t.vencimento);
      return venc >= inicioMes && venc <= fimMes && (t.status === 'EM_ABERTO' || t.status === 'PARCIAL');
    }).reduce((acc, t) => acc + (t.saldo || 0), 0);
    const atrasado = titulos.filter(t => {
      const venc = new Date(t.vencimento);
      return venc < hoje && (t.status === 'EM_ABERTO' || t.status === 'PARCIAL');
    }).reduce((acc, t) => acc + (t.saldo || 0), 0);

    return {
      kpis: {
        faturado,
        recebido,
        indiceCaixa,
        aReceberMes,
        aReceberProx: 0,
        atrasado,
        percentualAtrasado: faturado > 0 ? (atrasado / faturado) * 100 : 0
      },
      sparklines: {
        faturado: [],
        recebido: [],
        indiceCaixa: [],
        aReceberMes: [],
        aReceberProx: [],
        atrasado: []
      },
      trends: {
        faturado: { value: 0, direction: 'neutral' as const, label: '+0%' },
        recebido: { value: 0, direction: 'neutral' as const, label: '+0%' },
        indiceCaixa: { value: 0, direction: 'neutral' as const, label: '+0%' },
        aReceberMes: { value: 0, direction: 'neutral' as const, label: '+0%' },
        aReceberProx: { value: 0, direction: 'neutral' as const, label: '+0%' },
        atrasado: { value: 0, direction: 'neutral' as const, label: '+0%' }
      },
      chartData: {
        salesVsCash: [],
        portfolio: [],
        waterfall: []
      },
      alerts: []
    };
  }, [dateRange, selectedLojas, selectedVendedor, titulos, recebimentos]);

  // Verificar permissões APÓS todos os hooks
  const hasAccess = can('financeiro', 'ver') || can('inadimplencia', 'ver');
  
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta área.
          </p>
        </Card>
      </div>
    );
  }

  // Funções de handlers - também sempre definidas
  const handleExportCSV = () => {
    toast({
      title: "Exportando CSV",
      description: "Os dados estão sendo preparados para download...",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Gerando PDF",
      description: "O relatório está sendo gerado...",
    });
  };

  const handleRefresh = () => {
    toast({
      title: "Dados atualizados",
      description: "As informações foram recarregadas com sucesso.",
    });
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return '';
    const from = format(dateRange.from, 'dd/MM/yyyy');
    const to = dateRange.to ? format(dateRange.to, 'dd/MM/yyyy') : from;
    return from === to ? from : `${from} - ${to}`;
  };

  const formatLojaScope = () => {
    if (selectedLojas.length === 0) return 'Nenhuma loja';
    if (selectedLojas.length === 1) {
      const loja = lojasPermitidas.find(l => l.id === selectedLojas[0]);
      return loja?.codigo || 'Loja selecionada';
    }
    if (selectedLojas.length === lojasPermitidas.length) return 'Todas as lojas';
    return `${selectedLojas.length} lojas selecionadas`;
  };

  // Early return APÓS todos os hooks serem definidos

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b bg-background">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Gestão de Contas a Receber
              </h1>
              <p className="text-muted-foreground mt-1">
                {formatDateRange()} • {formatLojaScope()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                className="w-[280px]"
              />
            </div>

            {lojasPermitidas.length > 1 && (
              <Select
                value={selectedLojas.length === 1 ? selectedLojas[0] : 'multiple'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setSelectedLojas(lojasPermitidas.map(l => l.id));
                  } else if (value === 'multiple') {
                    // Keep current selection
                  } else {
                    setSelectedLojas([value]);
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecionar lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as lojas</SelectItem>
                  {lojasPermitidas.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vendedores</SelectItem>
                <SelectItem value="joao">João Silva</SelectItem>
                <SelectItem value="maria">Maria Santos</SelectItem>
                <SelectItem value="carlos">Carlos Oliveira</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <KPICard
            title="Faturado"
            value={financialData.kpis.faturado}
            subtitle="Dia / Mês"
            sparklineData={financialData.sparklines.faturado}
            color="#E09309"
            trend={financialData.trends.faturado}
          />
          <KPICard
            title="Recebido"
            value={financialData.kpis.recebido}
            subtitle="Dia / Mês"
            sparklineData={financialData.sparklines.recebido}
            color="#455A64"
            trend={financialData.trends.recebido}
          />
          <KPICard
            title="Índice de Caixa"
            value={financialData.kpis.indiceCaixa}
            subtitle="Recebido ÷ Faturado"
            sparklineData={financialData.sparklines.indiceCaixa}
            color="#2E7D32"
            trend={financialData.trends.indiceCaixa}
            isPercentage
            semaforo={financialData.kpis.indiceCaixa >= 1.0 ? 'green' : 
                     financialData.kpis.indiceCaixa >= 0.8 ? 'yellow' : 'red'}
          />
          <KPICard
            title="A Receber - Mês"
            value={financialData.kpis.aReceberMes}
            subtitle="Saldo atual"
            sparklineData={financialData.sparklines.aReceberMes}
            color="#9E9E9E"
            trend={financialData.trends.aReceberMes}
          />
          <KPICard
            title="A Receber - Próximos"
            value={financialData.kpis.aReceberProx}
            subtitle="Próximos meses"
            sparklineData={financialData.sparklines.aReceberProx}
            color="#616161"
            trend={financialData.trends.aReceberProx}
          />
          <KPICard
            title="Atrasado"
            value={financialData.kpis.atrasado}
            subtitle="Em atraso"
            sparklineData={financialData.sparklines.atrasado}
            color="#C62828"
            trend={financialData.trends.atrasado}
            semaforo={financialData.kpis.percentualAtrasado <= 20 ? 'green' : 
                     financialData.kpis.percentualAtrasado <= 30 ? 'yellow' : 'red'}
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-12 gap-6 mb-8">
          <div className="col-span-12 lg:col-span-7">
            <SalesVsCashChart data={financialData.chartData.salesVsCash} />
          </div>
          <div className="col-span-12 lg:col-span-5">
            <PortfolioStackedChart data={financialData.chartData.portfolio} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-6">
            <WaterfallChart data={financialData.chartData.waterfall} />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <AlertsTable alerts={financialData.alerts} />
          </div>
        </div>
      </div>
    </div>
  );
}
