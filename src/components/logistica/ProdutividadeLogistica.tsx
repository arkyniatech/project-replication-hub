import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabaseLogisticaMetricas, useLogisticaKPIs } from "@/hooks/useSupabaseLogisticaMetricas";
import { useSupabaseLogisticaMotoristas } from "@/hooks/useSupabaseLogisticaMotoristas";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  Target,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface KPICard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
}

export function ProdutividadeLogistica() {
  const { session } = useMultiunidade();
  const lojaId = session.lojaAtivaId || '';
  
  const [periodo, setPeriodo] = useState('hoje');
  const [motoristaFiltro, setMotoristaFiltro] = useState<string>('todos');

  const { motoristas } = useSupabaseLogisticaMotoristas(lojaId);

  // Calcular datas com base no período
  const { dataInicio, dataFim } = useMemo(() => {
    const hoje = new Date();
    let inicio = new Date();
    let fim = new Date();

    switch (periodo) {
      case 'hoje':
        inicio = hoje;
        fim = hoje;
        break;
      case 'semana':
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - hoje.getDay());
        fim = hoje;
        break;
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = hoje;
        break;
    }

    return {
      dataInicio: inicio.toISOString().split('T')[0],
      dataFim: fim.toISOString().split('T')[0]
    };
  }, [periodo]);

  // Buscar métricas do Supabase
  const { data: metricas, isLoading } = useSupabaseLogisticaMetricas({
    lojaId,
    dataInicio,
    dataFim,
    motoristaId: motoristaFiltro && motoristaFiltro !== 'todos' ? motoristaFiltro : undefined
  });

  // Calcular KPIs agregados
  const kpisData = useLogisticaKPIs(metricas);

  const kpis: KPICard[] = [
    {
      title: "Planejado vs Concluído",
      value: `${kpisData.totalConcluidas}/${kpisData.totalPlanejadas}`,
      change: `${kpisData.taxaConclusao}%`,
      trend: kpisData.taxaConclusao >= 80 ? 'up' : 'down',
      icon: Target
    },
    {
      title: "% Dentro da Janela",
      value: `${kpisData.taxaOnWindow}%`,
      change: kpisData.taxaOnWindow >= 80 ? "+5%" : "-5%",
      trend: kpisData.taxaOnWindow >= 80 ? 'up' : 'down',
      icon: Clock
    },
    {
      title: "Reagendamentos",
      value: kpisData.totalReagendadas.toString(),
      change: kpisData.totalReagendadas > 5 ? "+2" : "-2",
      trend: kpisData.totalReagendadas > 5 ? 'up' : 'down',
      icon: AlertTriangle
    },
    {
      title: "KM Estimado",
      value: `${kpisData.kmTotal} km`,
      change: `${kpisData.kmPorEntrega} km/entrega`,
      trend: 'neutral',
      icon: MapPin
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-500" />;
      default: return null;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Carregando métricas...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Produtividade Logística
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div>
              <label className="text-sm font-medium">Período</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Motorista</label>
              <Select value={motoristaFiltro} onValueChange={setMotoristaFiltro}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {motoristas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(kpi.trend)}`}>
                    {getTrendIcon(kpi.trend)}
                    <span>{kpi.change}</span>
                  </div>
                </div>
                <kpi.icon className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="comparacao" className="space-y-6">
        <TabsList>
          <TabsTrigger value="comparacao">Comparação por Loja</TabsTrigger>
          <TabsTrigger value="performance">Performance Semanal</TabsTrigger>
          <TabsTrigger value="motivos">Análise de Motivos</TabsTrigger>
        </TabsList>

        <TabsContent value="comparacao">
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Planejadas</p>
                    <p className="text-2xl font-bold">{kpisData.totalPlanejadas}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Concluídas</p>
                    <p className="text-2xl font-bold">{kpisData.totalConcluidas}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Taxa</p>
                    <p className="text-2xl font-bold">{kpisData.taxaConclusao}%</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">KM Total</p>
                    <p className="text-2xl font-bold">{kpisData.kmTotal}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Diária</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metricas || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data_iso" />
                    <YAxis />
                    <Line 
                      type="monotone" 
                      dataKey="planejadas" 
                      stroke="#8884d8" 
                      name="Planejadas" 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="concluidas" 
                      stroke="#10B981" 
                      name="Concluídas" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="motivos">
          <Card>
            <CardHeader>
              <CardTitle>Top Motivos de Falha</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {kpisData.topMotivos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum motivo de falha registrado no período
                  </p>
                ) : (
                  kpisData.topMotivos.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{item.motivo}</span>
                      <Badge variant="secondary">{item.count} ocorrências</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}