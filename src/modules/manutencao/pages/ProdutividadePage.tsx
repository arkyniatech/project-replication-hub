import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Remove unused import
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { 
  TrendingUp,
  Users,
  Wrench,
  CheckCircle,
  Clock,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSupabaseProdutividadeManutencao } from "@/hooks/useSupabaseProdutividadeManutencao";
import { useMultiunidade } from "@/hooks/useMultiunidade";

export default function ProdutividadePage() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<{from: Date; to: Date}>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [lojaSelecionada, setLojaSelecionada] = useState<string>("todos");
  const [mecanicoSelecionado, setMecanicoSelecionado] = useState<string>("todos");

  const { lojas } = useMultiunidade();

  const { 
    produtividade, 
    produtividadeHoje,
    produtividadeSemana,
    produtividadeMes,
    isLoading 
  } = useSupabaseProdutividadeManutencao(
    periodo.from.toISOString().split('T')[0],
    periodo.to.toISOString().split('T')[0]
  );

  // Extrair mecânicos únicos dos dados de produtividade
  const mecanicosUnicos = useMemo(() => {
    const ids = new Set<string>();
    produtividade.forEach(p => {
      if (p.mecanico_id) ids.add(p.mecanico_id);
    });
    return Array.from(ids);
  }, [produtividade]);

  const prodToday = produtividadeHoje;
  const prodWeek = produtividadeSemana;
  const prodMonth = produtividadeMes;

  // Filter data based on selections
  const dadosFiltrados = useMemo(() => {
    return produtividade.filter(p => {
      const data = new Date(p.data_iso);
      const dentroPeríodo = data >= startOfDay(periodo.from) && data <= endOfDay(periodo.to);
      const mecMatch = mecanicoSelecionado === "todos" || p.mecanico_id === mecanicoSelecionado;
      
      return dentroPeríodo && mecMatch;
    });
  }, [produtividade, periodo.from, periodo.to, mecanicoSelecionado]);

  // Calculate totals
  const totais = useMemo(() => {
    return dadosFiltrados.reduce((acc, p) => ({
      limpas: acc.limpas + p.limpas,
      liberadas: acc.liberadas + p.liberadas,
      aguardDiag: acc.aguardDiag + p.aguard_diag,
      aguardPeca: acc.aguardPeca + p.aguard_peca,
      suportes: acc.suportes + p.suportes,
      andaimesLimpas: acc.andaimesLimpas + p.andaimes_limpas,
      andaimesLiberadas: acc.andaimesLiberadas + p.andaimes_liberadas,
      escorasLimpas: acc.escorasLimpas + p.escoras_limpas,
      escorasLiberadas: acc.escorasLiberadas + p.escoras_liberadas
    }), {
      limpas: 0, liberadas: 0, aguardDiag: 0, aguardPeca: 0, suportes: 0,
      andaimesLimpas: 0, andaimesLiberadas: 0, escorasLimpas: 0, escorasLiberadas: 0
    });
  }, [dadosFiltrados]);

  // Chart data
  const chartData = useMemo(() => {
    return dadosFiltrados.map(p => ({
      data: format(new Date(p.data_iso), "dd/MM", { locale: ptBR }),
      Liberadas: p.liberadas,
      Limpas: p.limpas,
      "Aguard. Diag.": p.aguard_diag,
      "Aguard. Peça": p.aguard_peca,
      Suportes: p.suportes
    }));
  }, [dadosFiltrados]);

  const kpis = [
    {
      title: "Liberadas",
      value: totais.liberadas,
      icon: CheckCircle,
      color: "text-green-600",
      today: prodToday?.liberadas || 0,
      week: prodWeek?.reduce((acc, p) => acc + p.liberadas, 0) || 0,
      month: prodMonth?.reduce((acc, p) => acc + p.liberadas, 0) || 0
    },
    {
      title: "Limpas",
      value: totais.limpas,
      icon: Wrench,
      color: "text-blue-600",
      today: prodToday?.limpas || 0,
      week: prodWeek?.reduce((acc, p) => acc + p.limpas, 0) || 0,
      month: prodMonth?.reduce((acc, p) => acc + p.limpas, 0) || 0
    },
    {
      title: "Aguard. Diag.",
      value: totais.aguardDiag,
      icon: Clock,
      color: "text-orange-600",
      today: prodToday?.aguard_diag || 0,
      week: prodWeek?.reduce((acc, p) => acc + p.aguard_diag, 0) || 0,
      month: prodMonth?.reduce((acc, p) => acc + p.aguard_diag, 0) || 0
    },
    {
      title: "Aguard. Peça",
      value: totais.aguardPeca,
      icon: Users,
      color: "text-red-600",
      today: prodToday?.aguard_peca || 0,
      week: prodWeek?.reduce((acc, p) => acc + p.aguard_peca, 0) || 0,
      month: prodMonth?.reduce((acc, p) => acc + p.aguard_peca, 0) || 0
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/manutencao')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Produtividade da Oficina</h1>
          <p className="text-muted-foreground">Acompanhamento e comparativo de performance</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Período</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={periodo.from.toISOString().split('T')[0]}
                  onChange={(e) => setPeriodo(prev => ({ ...prev, from: new Date(e.target.value) }))}
                  className="px-3 py-2 border rounded-md"
                />
                <input
                  type="date"
                  value={periodo.to.toISOString().split('T')[0]}
                  onChange={(e) => setPeriodo(prev => ({ ...prev, to: new Date(e.target.value) }))}
                  className="px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Loja</label>
              <Select value={lojaSelecionada} onValueChange={setLojaSelecionada}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              <SelectContent>
                  <SelectItem value="todos">Todas as lojas</SelectItem>
                  {lojas.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Mecânico</label>
              <Select value={mecanicoSelecionado} onValueChange={setMecanicoSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {mecanicosUnicos.map(id => (
                    <SelectItem key={id} value={id}>{id.substring(0, 8)}...</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm">{kpi.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                    <div>H: {kpi.today}</div>
                    <div>S: {kpi.week}</div>
                    <div>M: {kpi.month}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolução Diária</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="Liberadas" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="Limpas" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparativo por Atividade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Liberadas" fill="#10b981" />
                <Bar dataKey="Limpas" fill="#3b82f6" />
                <Bar dataKey="Aguard. Diag." fill="#f59e0b" />
                <Bar dataKey="Aguard. Peça" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Andaimes - Produtividade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Limpas</span>
                <span className="font-medium">{totais.andaimesLimpas}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Liberadas</span>
                <span className="font-medium">{totais.andaimesLiberadas}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escoras - Produtividade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Limpas</span>
                <span className="font-medium">{totais.escorasLimpas}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Liberadas</span>
                <span className="font-medium">{totais.escorasLiberadas}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}