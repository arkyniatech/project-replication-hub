import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus, Calendar, DollarSign, AlertTriangle, Wallet, Target, RefreshCw, Download, FileText } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useSupabaseParcelasPagar } from '@/hooks/useSupabaseParcelasPagar';
import { useSupabaseContasFinanceiras } from '@/hooks/useSupabaseContasFinanceiras';
import { useSupabaseMovimentosPagar } from '@/hooks/useSupabaseMovimentosPagar';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  variant?: 'default' | 'warning' | 'success';
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
  subtitle?: string;
}

function KPICard({ title, value, icon: Icon, variant = 'default', trend, subtitle }: KPICardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return 'border-orange-200 bg-orange-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-border bg-card';
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <ArrowUp className="w-3 h-3 text-red-500" />;
      case 'down':
        return <ArrowDown className="w-3 h-3 text-green-500" />;
      default:
        return <Minus className="w-3 h-3 text-gray-500" />;
    }
  };

  return (
    <Card className={getVariantStyles()}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(value)}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center space-x-1 mt-2">
            {getTrendIcon()}
            <span className="text-xs text-muted-foreground">
              {formatCurrency(Math.abs(trend.value))} vs ontem
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PagarDashboard() {
  const { can } = usePermissions();
  const { lojaAtual } = useMultiunidade();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  // Connect period selector to query range
  const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '90d' ? 90 : 30;

  const { parcelas: parcelasData, isLoading: loadingParcelas } = useSupabaseParcelasPagar({
    lojaId: lojaAtual?.id,
    dataInicio: format(subDays(hoje, periodDays), 'yyyy-MM-dd'),
    dataFim: format(fimMes, 'yyyy-MM-dd')
  });

  const { movimentos, isLoading: loadingMovimentos } = useSupabaseMovimentosPagar();
  const { contas } = useSupabaseContasFinanceiras(lojaAtual?.id);

  // Calcular KPIs reais
  const kpis = useMemo(() => {
    const apagarMes = parcelasData
      .filter(p => p.vencimento >= format(inicioMes, 'yyyy-MM-dd') && p.vencimento <= format(fimMes, 'yyyy-MM-dd'))
      .reduce((sum, p) => sum + p.saldo, 0);

    const pagarHoje = parcelasData
      .filter(p => p.vencimento === format(hoje, 'yyyy-MM-dd') && p.saldo > 0)
      .reduce((sum, p) => sum + p.saldo, 0);

    const pagarAmanha = parcelasData
      .filter(p => p.vencimento === format(amanha, 'yyyy-MM-dd') && p.saldo > 0)
      .reduce((sum, p) => sum + p.saldo, 0);

    const atrasadas = parcelasData
      .filter(p => p.status === 'VENCIDA' || (p.vencimento < format(hoje, 'yyyy-MM-dd') && p.saldo > 0))
      .reduce((sum, p) => sum + p.saldo, 0);

    const saldoContas = contas.reduce((sum, c) => sum + c.saldo_atual, 0);
    const saldoAposPagamentos = saldoContas - pagarHoje;

    return {
      apagarMes,
      pagarHoje,
      pagarAmanha,
      atrasadas,
      variacao: 0,
      saldoContas,
      saldoAposPagamentos
    };
  }, [parcelasData, contas, hoje, amanha, inicioMes, fimMes]);

  // Dados para gráficos
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() - (6 - i));
      return format(d, 'yyyy-MM-dd');
    });

    return last7Days.map(dateStr => {
      const vencimentos = parcelasData
        .filter(p => p.vencimento === dateStr)
        .reduce((sum, p) => sum + p.valor, 0);

      const pagamentos = movimentos
        .filter(m => m.data_pagamento === dateStr)
        .reduce((sum, m) => sum + m.valor_liquido, 0);

      return {
        data: format(new Date(dateStr), 'dd/MM'),
        vencimentos,
        pagamentos
      };
    });
  }, [parcelasData, movimentos, hoje]);

  const categoriaData = useMemo(() => {
    const grouped = parcelasData.reduce((acc, p) => {
      const cat = p.categoria_codigo || 'Outros';
      if (!acc[cat]) {
        acc[cat] = { name: cat, value: 0, codigo: cat, color: '#E09309' };
      }
      acc[cat].value += p.saldo;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }, [parcelasData]);

  // Verificar permissões
  const hasAccess = can('financeiro', 'ver');
  
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Você não tem permissão para acessar o dashboard de Contas a Pagar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExportData = () => {
    toast.info("Exportando dados", {
      description: "Download iniciado em formato CSV"
    });
  };

  const handleGenerateReport = () => {
    toast.info("Gerando relatório", {
      description: "PDF será criado com os dados filtrados"
    });
  };

  const formatTooltip = (value: any, name: string) => [
    formatCurrency(Number(value)),
    name === 'pagamentos' ? 'Pagamentos' : 'Vencimentos'
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Dashboard - Contas a Pagar
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {lojaAtual ? `Loja: ${lojaAtual.nome}` : 'Todas as lojas'} • 
                Período: {selectedPeriod === '30d' ? 'Últimos 30 dias' : 'Personalizado'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerateReport}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          <div className="xl:col-span-2">
            <KPICard
              title="A Pagar no Mês"
              value={kpis.apagarMes}
              icon={Calendar}
              subtitle="Total de parcelas do mês"
            />
          </div>
          <KPICard
            title="Pagar Hoje"
            value={kpis.pagarHoje}
            icon={DollarSign}
            variant="warning"
          />
          <KPICard
            title="Pagar Amanhã"
            value={kpis.pagarAmanha}
            icon={Target}
          />
          <KPICard
            title="Atrasadas"
            value={kpis.atrasadas}
            icon={AlertTriangle}
            variant="warning"
            trend={{ value: kpis.variacao, direction: 'up' }}
          />
          <KPICard
            title="Saldo das Contas"
            value={kpis.saldoContas}
            icon={Wallet}
            variant="success"
          />
          <div className="xl:col-span-2">
            <KPICard
              title="Saldo Após Pagamentos"
              value={kpis.saldoAposPagamentos}
              icon={Wallet}
              subtitle="Considerando pagamentos do dia"
            />
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          {/* Gráfico de Pagamentos vs Vencimentos */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-lg">Pagamentos vs Vencimentos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Comparativo dos últimos 7 dias
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis tickFormatter={(value: any) => formatCurrency(Number(value))} />
                    <Tooltip formatter={formatTooltip} />
                    <Bar dataKey="vencimentos" fill="#E09309" name="vencimentos" />
                    <Bar dataKey="pagamentos" fill="#455A64" name="pagamentos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Distribuição por Categoria */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Categoria</CardTitle>
              <p className="text-sm text-muted-foreground">
                A pagar no mês atual
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoriaData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                    >
                      {categoriaData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas e Ações Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alertas do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {kpis.pagarHoje > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-900">
                          {parcelasData.filter(p => p.vencimento === format(hoje, 'yyyy-MM-dd')).length} parcelas vencendo hoje
                        </p>
                        <p className="text-sm text-orange-700">Total: {formatCurrency(kpis.pagarHoje)}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Ver Parcelas
                    </Button>
                  </div>
                )}
                
                {kpis.atrasadas > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900">
                          {parcelasData.filter(p => p.status === 'VENCIDA').length} parcelas em atraso
                        </p>
                        <p className="text-sm text-red-700">Total: {formatCurrency(kpis.atrasadas)}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Resolver
                    </Button>
                  </div>
                )}
                
                {kpis.pagarHoje === 0 && kpis.atrasadas === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum alerta no momento
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button className="h-auto p-4 flex flex-col items-start gap-2" variant="outline">
                  <DollarSign className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Lançar Título</p>
                    <p className="text-xs text-muted-foreground">Nova conta a pagar</p>
                  </div>
                </Button>
                
                <Button className="h-auto p-4 flex flex-col items-start gap-2" variant="outline">
                  <Calendar className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Ver Parcelas</p>
                    <p className="text-xs text-muted-foreground">Lista completa</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}