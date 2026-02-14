import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, Package, TrendingDown, Archive } from 'lucide-react';
import { useAlmoxStore } from '@/modules/almox/store/almoxStore';
import { useRbac } from '@/hooks/useRbac';

// Mock data for charts
const curvaAbcData = [
  { item: 'Filtro Óleo', valor: 15420, categoria: 'A' },
  { item: 'Pastilha Freio', valor: 12800, categoria: 'A' },
  { item: 'Correia Motor', valor: 9500, categoria: 'B' },
  { item: 'Vela Ignição', valor: 7300, categoria: 'B' },
  { item: 'Lâmpada H4', valor: 4200, categoria: 'C' },
  { item: 'Fusível 10A', valor: 2100, categoria: 'C' },
];

const estoqueData = [
  { mes: 'Jan', entradas: 125, saidas: 98 },
  { mes: 'Fev', entradas: 142, saidas: 115 },
  { mes: 'Mar', entradas: 158, saidas: 132 },
  { mes: 'Abr', entradas: 134, saidas: 127 },
  { mes: 'Mai', entradas: 167, saidas: 149 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function PainelAlmox() {
  const { can } = useRbac();
  const { 
    getEstoquePorLoja,
    getItensEstoqueCritico,
    getCoberturaItensCriticos,
    getRupturasMes,
    catalogoItens 
  } = useAlmoxStore();
  
  const [selectedLoja, setSelectedLoja] = useState<string>('loja-1');
  
  const estoqueLoja = getEstoquePorLoja(selectedLoja);
  const itensCriticos = getItensEstoqueCritico(selectedLoja);
  const coberturaItensCriticos = getCoberturaItensCriticos();
  const rupturasMes = getRupturasMes(selectedLoja);
  
  // Filter by RBAC - hide Patrimonial if no permission
  const canViewPatrimonial = can('almox:patrimonial');
  const filteredEstoque = canViewPatrimonial 
    ? estoqueLoja 
    : estoqueLoja.filter(e => e.item.tipo !== 'PATRIMONIAL');
  
  const filteredCriticos = canViewPatrimonial 
    ? itensCriticos 
    : itensCriticos.filter(e => e.item.tipo !== 'PATRIMONIAL');

  // Calculate KPIs
  const totalItens = canViewPatrimonial 
    ? catalogoItens.length 
    : catalogoItens.filter(i => i.tipo !== 'PATRIMONIAL').length;
    
  const itensAtivos = canViewPatrimonial 
    ? catalogoItens.filter(i => i.ativo).length
    : catalogoItens.filter(i => i.ativo && i.tipo !== 'PATRIMONIAL').length;

  // Breakdown by type
  const breakdownData = [
    { 
      name: 'Peças', 
      value: catalogoItens.filter(i => i.tipo === 'PECA').length,
      color: '#0088FE'
    },
    { 
      name: 'Consumíveis', 
      value: catalogoItens.filter(i => i.tipo === 'CONSUMIVEL').length,
      color: '#00C49F'
    }
  ];

  if (canViewPatrimonial) {
    breakdownData.push({
      name: 'Patrimonial',
      value: catalogoItens.filter(i => i.tipo === 'PATRIMONIAL').length,
      color: '#FFBB28'
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel do Almoxarifado</h1>
          <p className="text-muted-foreground">
            Acompanhe KPIs e performance do estoque
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedLoja} onValueChange={setSelectedLoja}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="loja-1">Loja Principal</SelectItem>
              <SelectItem value="loja-2">Filial 1</SelectItem>
              <SelectItem value="loja-3">Filial 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens com Estoque Crítico</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{filteredCriticos.length}</div>
            <p className="text-xs text-muted-foreground">
              Abaixo do mínimo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura Peças Críticas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coberturaItensCriticos}%</div>
            <p className="text-xs text-muted-foreground">
              Meta: 90%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rupturas no Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rupturasMes}</div>
            <p className="text-xs text-muted-foreground">
              -2 vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItens}</div>
            <p className="text-xs text-muted-foreground">
              {itensAtivos} ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={breakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {breakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock Movement */}
        <Card>
          <CardHeader>
            <CardTitle>Movimentação de Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={estoqueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="entradas" fill="#10b981" name="Entradas" />
                <Bar dataKey="saidas" fill="#ef4444" name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Critical Items */}
      {filteredCriticos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Itens em Estoque Crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredCriticos.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.item.sku}</span>
                      <Badge className={
                        item.item.tipo === 'PECA' ? 'bg-blue-100 text-blue-800' :
                        item.item.tipo === 'CONSUMIVEL' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }>
                        {item.item.tipo}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.item.descricao}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      <span className="font-medium text-red-600">Atual: {item.saldo}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Mín: {item.item.estoqueMinimo}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABC Analysis - Only for Peças */}
      <Card>
        <CardHeader>
          <CardTitle>Curva ABC - Peças (Por Valor)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {curvaAbcData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <Badge className={
                    item.categoria === 'A' ? 'bg-red-100 text-red-800' :
                    item.categoria === 'B' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }>
                    {item.categoria}
                  </Badge>
                  <span className="font-medium">{item.item}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">
                    R$ {item.valor.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}