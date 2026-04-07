import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Calendar, 
  AlertTriangle,
  Plus,
  UserPlus,
  FileText,
  CheckSquare,
  Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { useMemo } from 'react';

export default function Dashboard() {
  const { pessoas, isLoading } = useSupabasePessoas();

  const stats = useMemo(() => {
    const ativos = pessoas.filter(p => p.situacao === 'ativo');
    const inativos = pessoas.filter(p => p.situacao === 'inativo');
    const headcount = ativos.length;
    const turnover = (ativos.length + inativos.length) > 0
      ? ((inativos.length / (ativos.length + inativos.length)) * 100).toFixed(1)
      : '0';

    // Distribuição por cargo
    const cargosMap: Record<string, number> = {};
    ativos.forEach(p => {
      const cargo = p.cargo || 'Sem cargo';
      cargosMap[cargo] = (cargosMap[cargo] || 0) + 1;
    });
    const distribuicao = Object.entries(cargosMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({
        name,
        value,
        color: ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i] || '#94a3b8'
      }));

    return { headcount, turnover, distribuicao };
  }, [pessoas]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpiData = [
    { title: 'Headcount', value: String(stats.headcount), icon: Users, color: 'text-blue-600' },
    { title: 'Turnover', value: `${stats.turnover}%`, icon: TrendingUp, color: 'text-green-600' },
    { title: 'HE Acumuladas', value: 'N/D', icon: Clock, color: 'text-orange-600' },
    { title: 'Férias Vencidas', value: 'N/D', icon: Calendar, color: 'text-red-600' },
    { title: 'Absenteísmo', value: 'N/D', icon: AlertTriangle, color: 'text-yellow-600' }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiData.map((kpi) => (
          <Card key={kpi.title} className="h-16">
            <CardContent className="p-3">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-lg font-bold">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Cargo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Cargo</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.distribuicao.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.distribuicao}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stats.distribuicao.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Nenhum colaborador cadastrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Colaboradores Ativos</span>
                <Badge variant="default">{stats.headcount}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Inativos</span>
                <Badge variant="secondary">{pessoas.filter(p => p.situacao === 'inativo').length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Cadastrados</span>
                <Badge variant="outline">{pessoas.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Atalhos Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-14 flex-col gap-1 text-sm">
              <Plus className="h-4 w-4" />
              Nova Vaga
            </Button>
            <Button variant="outline" className="h-14 flex-col gap-1 text-sm">
              <UserPlus className="h-4 w-4" />
              Admitir
            </Button>
            <Button variant="outline" className="h-14 flex-col gap-1 text-sm">
              <FileText className="h-4 w-4" />
              Publicar Holerites
            </Button>
            <Button variant="outline" className="h-14 flex-col gap-1 text-sm">
              <CheckSquare className="h-4 w-4" />
              Aprovações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
