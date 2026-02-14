import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, UserCheck, UserX, Percent } from 'lucide-react';
import { useRhStore } from '../../store/rhStore';
import { buildHeadcountSeries, buildTurnover } from '../../utils/seedRhContent';

export default function RelatorioExecutivo() {
  const { pessoas, aprovacoes, ausencias } = useRhStore();
  
  const headcountData = buildHeadcountSeries(pessoas);
  const turnoverRate = buildTurnover(pessoas);
  const pessoasAtivas = pessoas.filter(p => p.situacao === 'ativo');
  
  // KPIs calculados
  const totalAdmissoes12m = headcountData.reduce((sum, month) => sum + month.admissoes, 0);
  const totalDesligamentos12m = headcountData.reduce((sum, month) => sum + month.desligamentos, 0);
  const absenteismo = Math.round((ausencias.length / pessoasAtivas.length) * 100 * 10) / 10; // Mock calculation
  const heAcumuladas = Math.floor(Math.random() * 500 + 100); // Mock

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  const costCenterData = [
    { name: 'Administração', value: 25, headcount: 15 },
    { name: 'Vendas', value: 35, headcount: 21 },
    { name: 'Operação', value: 30, headcount: 18 },
    { name: 'Manutenção', value: 10, headcount: 6 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatório Executivo</h1>
        <p className="text-muted-foreground">Visão estratégica de RH</p>
      </div>

      {/* KPIs Executivos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Headcount Atual</p>
                <p className="text-2xl font-bold">{pessoasAtivas.length}</p>
                <p className="text-xs text-green-600">+{totalAdmissoes12m - totalDesligamentos12m} este ano</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Turnover (12m)</p>
                <p className="text-2xl font-bold">{turnoverRate}%</p>
                <p className="text-xs text-muted-foreground">{totalDesligamentos12m} desligamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Percent className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Absenteísmo</p>
                <p className="text-2xl font-bold">{absenteismo}%</p>
                <p className="text-xs text-muted-foreground">{ausencias.length} ausências</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">HE Acumuladas</p>
                <p className="text-2xl font-bold">{heAcumuladas}h</p>
                <p className="text-xs text-muted-foreground">Banco de horas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount Evolution */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Evolução do Headcount</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={headcountData}>
                <XAxis dataKey="mes" tickFormatter={(value) => value.slice(5)} />
                <YAxis />
                <Tooltip labelFormatter={(value) => `Mês: ${value}`} />
                <Area 
                  type="monotone" 
                  dataKey="headcount" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Admissions vs Departures */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Admissões vs Desligamentos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={headcountData}>
                <XAxis dataKey="mes" tickFormatter={(value) => value.slice(5)} />
                <YAxis />
                <Tooltip labelFormatter={(value) => `Mês: ${value}`} />
                <Bar dataKey="admissoes" fill="#82ca9d" name="Admissões" />
                <Bar dataKey="desligamentos" fill="#ff7300" name="Desligamentos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Center Distribution */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Distribuição por Centro de Custo</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costCenterData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costCenterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Percentual']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Metrics */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Métricas Rápidas</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Taxa de Aprovação (Seleção)</span>
                <Badge variant="outline">68%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tempo Médio de Contratação</span>
                <Badge variant="outline">22 dias</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Satisfação Interna (Mock)</span>
                <Badge variant="default">4.2/5</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pendências RH</span>
                <Badge variant={aprovacoes.filter(a => a.status === 'pendente').length > 10 ? "destructive" : "default"}>
                  {aprovacoes.filter(a => a.status === 'pendente').length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}