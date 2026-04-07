import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, TrendingUp, Users, Percent, Download, Filter } from 'lucide-react';
import { useRhStore } from '../../store/rhStore';
import { buildRhFinance, currency } from '../../utils/helpers';
import { format, subMonths } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function RelatorioFinanceiro() {
  const { toast } = useToast();
  const { pessoas, beneficios, elegibilidades, vinculosBeneficio } = useRhStore();
  const [filtros, setFiltros] = useState({
    periodo: format(new Date(), 'yyyy-MM'),
    loja: 'all',
    cc: 'all',
    cargo: 'all'
  });

  // Filter people based on filters
  const pessoasFiltradas = pessoas.filter(p => {
    const lojaMatch = filtros.loja === 'all' || p.lojaId === filtros.loja;
    const ccMatch = filtros.cc === 'all' || p.ccId === filtros.cc;
    const cargoMatch = filtros.cargo === 'all' || p.cargo === filtros.cargo;
    return lojaMatch && ccMatch && cargoMatch;
  });

  // Build financial data
  const financeData = buildRhFinance(pessoasFiltradas, beneficios, elegibilidades);

  // Monthly trend data (last 12 months)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(new Date(), 11 - i);
    const monthStr = format(month, 'MMM/yy');
    
    // Mock monthly variation (±5%)
    const variation = (Math.random() - 0.5) * 0.1;
    const custoMes = financeData.custoTotal * (1 + variation);
    
    return {
      mes: monthStr,
      custo: Math.round(custoMes)
    };
  });

  // Cost by unit/CC
  const lojas = Array.from(new Set(pessoasFiltradas.map(p => p.lojaId)));
  const ccs = Array.from(new Set(pessoasFiltradas.map(p => p.ccId))).filter(Boolean);

  const custoUnidadeData = [
    ...lojas.map(lojaId => {
      const pessoasLoja = pessoasFiltradas.filter(p => p.lojaId === lojaId);
      const custoLoja = pessoasLoja.reduce((acc, p) => {
        const custoBasePorCargo = {
          'Vendedor': 3500,
          'Operador': 2800,
          'Supervisor': 4500,
          'Gerente': 6500,
          'Assistente': 2500
        };
        const salarioBase = custoBasePorCargo[p.cargo as keyof typeof custoBasePorCargo] || 3000;
        const beneficiosCusto = 450; // Mock average benefits cost
        return acc + salarioBase + beneficiosCusto;
      }, 0);
      
      return {
        nome: `Loja ${lojaId.split('-')[1]}`,
        tipo: 'Loja',
        custo: custoLoja,
        colaboradores: pessoasLoja.length
      };
    }),
    ...ccs.map(ccId => {
      const pessoasCC = pessoasFiltradas.filter(p => p.ccId === ccId);
      const custoCC = pessoasCC.reduce((acc, p) => {
        const custoBasePorCargo = {
          'Vendedor': 3500,
          'Operador': 2800,
          'Supervisor': 4500,
          'Gerente': 6500,
          'Assistente': 2500
        };
        const salarioBase = custoBasePorCargo[p.cargo as keyof typeof custoBasePorCargo] || 3000;
        const beneficiosCusto = 450;
        return acc + salarioBase + beneficiosCusto;
      }, 0);
      
      return {
        nome: `CC-${ccId.split('-')[1]}`,
        tipo: 'CC',
        custo: custoCC,
        colaboradores: pessoasCC.length
      };
    })
  ].sort((a, b) => b.custo - a.custo);

  // Detailed employee costs
  const colaboradorDetalhado = pessoasFiltradas.map(pessoa => {
    const custoBasePorCargo = {
      'Vendedor': 3500,
      'Operador': 2800,
      'Supervisor': 4500,
      'Gerente': 6500,
      'Assistente': 2500
    };
    
    const salarioBase = custoBasePorCargo[pessoa.cargo as keyof typeof custoBasePorCargo] || 3000;
    const beneficiosCusto = 450; // Mock benefits cost
    const custoTotal = salarioBase + beneficiosCusto;
    
    return {
      nome: pessoa.nome,
      cargo: pessoa.cargo,
      loja: `Loja ${pessoa.lojaId.split('-')[1]}`,
      cc: pessoa.ccId ? `CC-${pessoa.ccId.split('-')[1]}` : '-',
      salarioBase,
      beneficios: beneficiosCusto,
      custoTotal
    };
  }).sort((a, b) => b.custoTotal - a.custoTotal);

  const handleExport = (tipo: 'csv' | 'pdf') => {
    toast({
      title: "Export realizado",
      description: `Relatório Financeiro RH exportado em ${tipo.toUpperCase()} (mock)`
    });
  };

  const lojasList = ['loja-1', 'loja-2', 'loja-3'];
  const centrosCusto = Array.from(new Set(pessoas.map(p => p.ccId))).filter(Boolean);
  const cargosList = Array.from(new Set(pessoas.map(p => p.cargo)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatório Financeiro RH</h1>
          <p className="text-muted-foreground">Análise de custos com pessoal</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')} className="gap-2">
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
              <div>
                <Label htmlFor="periodo">Período</Label>
                <Input
                  id="periodo"
                  type="month"
                  value={filtros.periodo}
                  onChange={(e) => setFiltros(prev => ({ ...prev, periodo: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="loja">Loja</Label>
                <Select value={filtros.loja} onValueChange={(value) => setFiltros(prev => ({ ...prev, loja: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as lojas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as lojas</SelectItem>
                    {lojasList.map(loja => (
                      <SelectItem key={loja} value={loja}>Loja {loja.split('-')[1]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cc">Centro de Custo</Label>
                <Select value={filtros.cc} onValueChange={(value) => setFiltros(prev => ({ ...prev, cc: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os CCs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os CCs</SelectItem>
                    {centrosCusto.map(cc => (
                      <SelectItem key={cc} value={cc}>CC-{cc.split('-')[1]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cargo">Cargo</Label>
                <Select value={filtros.cargo} onValueChange={(value) => setFiltros(prev => ({ ...prev, cargo: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os cargos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os cargos</SelectItem>
                    {cargosList.map(cargo => (
                      <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{currency(financeData.custoMedio)}</div>
            <div className="text-sm text-muted-foreground">Custo Médio por Cargo</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{currency(financeData.custoTotal)}</div>
            <div className="text-sm text-muted-foreground">Custo Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{currency(financeData.custoMedio)}</div>
            <div className="text-sm text-muted-foreground">Custo Médio por Loja</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Percent className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{parseFloat(financeData.percentualBeneficios).toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">% Benefícios</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Cost by Unit/CC */}
        <Card>
          <CardHeader>
            <CardTitle>Custo por Unidade/CC</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={custoUnidadeData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [currency(value as number), 'Custo']} />
                <Bar dataKey="custo" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução Mensal (12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [currency(value as number), 'Custo']} />
                <Line type="monotone" dataKey="custo" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Colaborador</th>
                  <th className="text-left p-2">Cargo</th>
                  <th className="text-left p-2">Loja</th>
                  <th className="text-left p-2">CC</th>
                  <th className="text-right p-2">Salário Base</th>
                  <th className="text-right p-2">Benefícios</th>
                  <th className="text-right p-2">Custo Total</th>
                </tr>
              </thead>
              <tbody>
                {colaboradorDetalhado.slice(0, 20).map((colaborador, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{colaborador.nome}</td>
                    <td className="p-2">{colaborador.cargo}</td>
                    <td className="p-2">{colaborador.loja}</td>
                    <td className="p-2">{colaborador.cc}</td>
                    <td className="p-2 text-right">{currency(colaborador.salarioBase)}</td>
                    <td className="p-2 text-right">{currency(colaborador.beneficios)}</td>
                    <td className="p-2 text-right font-medium">{currency(colaborador.custoTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/50">
                  <td colSpan={4} className="p-2 font-bold">Total ({pessoasFiltradas.length} colaboradores)</td>
                  <td className="p-2 text-right font-bold">
                    {currency(colaboradorDetalhado.reduce((acc, c) => acc + c.salarioBase, 0))}
                  </td>
                  <td className="p-2 text-right font-bold">
                    {currency(colaboradorDetalhado.reduce((acc, c) => acc + c.beneficios, 0))}
                  </td>
                  <td className="p-2 text-right font-bold">
                    {currency(colaboradorDetalhado.reduce((acc, c) => acc + c.custoTotal, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {colaboradorDetalhado.length > 20 && (
            <div className="text-center py-4 text-muted-foreground">
              E mais {colaboradorDetalhado.length - 20} colaboradores...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}