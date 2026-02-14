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
  CheckSquare
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const kpiData = [
  { title: 'Headcount', value: '247', trend: '+3', icon: Users, color: 'text-blue-600' },
  { title: 'Turnover 12m', value: '8.2%', trend: '-0.5%', icon: TrendingUp, color: 'text-green-600' },
  { title: 'HE Acumuladas', value: '142h', trend: '+18h', icon: Clock, color: 'text-orange-600' },
  { title: 'Férias Vencidas', value: '12', trend: '-3', icon: Calendar, color: 'text-red-600' },
  { title: 'Absenteísmo', value: '2.1%', trend: '+0.3%', icon: AlertTriangle, color: 'text-yellow-600' }
];

const headcountData = [
  { month: 'Jan', value: 235 },
  { month: 'Fev', value: 241 },
  { month: 'Mar', value: 238 },
  { month: 'Abr', value: 245 },
  { month: 'Mai', value: 247 }
];

const distribuicaoData = [
  { name: 'Administrativo', value: 45, color: '#3b82f6' },
  { name: 'Comercial', value: 78, color: '#10b981' },
  { name: 'Operacional', value: 98, color: '#f59e0b' },
  { name: 'TI', value: 26, color: '#ef4444' }
];

export default function Dashboard() {
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
                  <div className="flex items-center gap-1">
                    <p className="text-lg font-bold">{kpi.value}</p>
                    <Badge variant="outline" className={`${kpi.color} text-xs px-1`}>
                      {kpi.trend}
                    </Badge>
                  </div>
                </div>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução do Headcount */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Headcount</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={headcountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Área */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Área</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={distribuicaoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="value"
                >
                  {distribuicaoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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