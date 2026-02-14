import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Clock, TrendingUp, CheckCircle, AlertTriangle, Package, Archive, TrendingDown } from 'lucide-react';
import { useComprasStore } from '@/modules/compras/store/comprasStore';
import { useAlmoxStore } from '@/modules/almox/store/almoxStore';
import { useRbac } from '@/hooks/useRbac';

// Mock data for charts
const leadTimeData = [
  { week: 'S1', reqToCot: 2.1, cotToAprov: 1.8, aprovToPo: 0.5, poToReceb: 6.2 },
  { week: 'S2', reqToCot: 1.9, cotToAprov: 1.2, aprovToPo: 0.8, poToReceb: 7.1 },
  { week: 'S3', reqToCot: 2.3, cotToAprov: 1.5, aprovToPo: 0.6, poToReceb: 5.8 },
  { week: 'S4', reqToCot: 2.0, cotToAprov: 1.4, aprovToPo: 0.7, poToReceb: 8.2 },
];

const estoqueData = [
  { mes: 'Jan', entradas: 125, saidas: 98 },
  { mes: 'Fev', entradas: 142, saidas: 115 },
  { mes: 'Mar', entradas: 158, saidas: 132 },
  { mes: 'Abr', entradas: 134, saidas: 127 },
  { mes: 'Mai', entradas: 167, saidas: 149 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function PainelUnificado() {
  const { can } = useRbac();
  const [filtroOrigem, setFiltroOrigem] = useState<string>('all');
  const [selectedLoja, setSelectedLoja] = useState<string>('loja-1');
  
  // Compras store
  const { 
    getLeadTimePorEtapa, 
    getPercentualCobertura2Fornecedores,
    getCotacoesDePedidoDePecas,
    cotacoes,
    pedidosCompra,
    requisicoes
  } = useComprasStore();
  
  // Almox store
  const { 
    getEstoquePorLoja,
    getItensEstoqueCritico,
    getCoberturaItensCriticos,
    getRupturasMes,
    catalogoItens 
  } = useAlmoxStore();
  
  const leadTimes = getLeadTimePorEtapa();
  const cobertura2Fornecedores = getPercentualCobertura2Fornecedores();
  const cotacoesPedidoPecas = getCotacoesDePedidoDePecas();
  
  // Almox data
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
  
  const aprovacoes1Tentativa = Math.round(
    (cotacoes.filter(c => c.status === 'aprovado').length / Math.max(cotacoes.length, 1)) * 100
  );

  const filteredData = filtroOrigem === 'OS' 
    ? { cotacoes: cotacoesPedidoPecas, pedidos: pedidosCompra.filter(p => 
        cotacoesPedidoPecas.some(c => c.id === p.cotacaoId)
      )}
    : { cotacoes, pedidos: pedidosCompra };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Compras & Estoque</h1>
          <p className="text-muted-foreground">
            Visão integrada de compras, almoxarifado e performance do estoque
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Origens</SelectItem>
              <SelectItem value="OS">Pedidos de Peças (OS)</SelectItem>
              <SelectItem value="REQ">Requisições</SelectItem>
            </SelectContent>
          </Select>
          
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

      <Tabs defaultValue="compras" className="w-full">
        <TabsList>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="integrado">Visão Integrada</TabsTrigger>
        </TabsList>

        <TabsContent value="compras" className="space-y-6">
          {/* Compras KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lead Time Médio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(leadTimes.reqToCot + leadTimes.cotToAprov + leadTimes.aprovToPo + leadTimes.poToReceb).toFixed(1)} dias
                </div>
                <div className="space-y-1 text-xs text-muted-foreground mt-2">
                  <div className="flex justify-between">
                    <span>REQ → COT</span>
                    <span>{leadTimes.reqToCot}d</span>
                  </div>
                  <div className="flex justify-between">
                    <span>COT → APROV</span>
                    <span>{leadTimes.cotToAprov}d</span>
                  </div>
                  <div className="flex justify-between">
                    <span>APROV → PO</span>
                    <span>{leadTimes.aprovToPo}d</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PO → RECEB</span>
                    <span>{leadTimes.poToReceb}d</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cobertura ≥2 Fornecedores</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cobertura2Fornecedores}%</div>
                <p className="text-xs text-muted-foreground">
                  +5% vs mês anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprovações 1ª Tentativa</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aprovacoes1Tentativa}%</div>
                <p className="text-xs text-muted-foreground">
                  Meta: 85%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos de Peças</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cotacoesPedidoPecas.length}</div>
                <p className="text-xs text-muted-foreground">
                  Cotações ativas da Oficina
                </p>
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Lead Time Azul→Verde: 2.1d
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Time Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução do Lead Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={leadTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="reqToCot" 
                      stroke="#8884d8" 
                      name="REQ → COT"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cotToAprov" 
                      stroke="#82ca9d" 
                      name="COT → APROV"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="aprovToPo" 
                      stroke="#ffc658" 
                      name="APROV → PO"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="poToReceb" 
                      stroke="#ff7300" 
                      name="PO → RECEB"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <Card>
              <CardHeader>
                <CardTitle>Status dos Processos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">{requisicoes.length}</div>
                    <div className="text-sm text-muted-foreground">Requisições</div>
                    <Badge className="bg-blue-100 text-blue-800 mt-1">
                      {requisicoes.filter(r => r.status === 'em_cotacao').length} Em Cotação
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{filteredData.cotacoes.length}</div>
                    <div className="text-sm text-muted-foreground">Cotações</div>
                    <Badge className="bg-yellow-100 text-yellow-800 mt-1">
                      {filteredData.cotacoes.filter(c => c.status === 'para_aprovacao').length} P/ Aprovação
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{filteredData.pedidos.length}</div>
                    <div className="text-sm text-muted-foreground">Pedidos</div>
                    <Badge className="bg-green-100 text-green-800 mt-1">
                      {filteredData.pedidos.filter(p => p.status === 'emitido').length} Emitidos
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="estoque" className="space-y-6">
          {/* Estoque KPI Cards */}
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
        </TabsContent>

        <TabsContent value="integrado" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integração Compras ↔ Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Performance Integrada</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Lead Time Compra → Estoque</span>
                      <span className="font-medium">{leadTimes.poToReceb} dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Itens críticos com pedido ativo</span>
                      <span className="font-medium text-yellow-600">
                        {Math.floor(filteredCriticos.length * 0.6)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Aproveitamento de pedidos OS</span>
                      <span className="font-medium text-green-600">
                        {cotacoesPedidoPecas.length} ativos
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Ações Recomendadas</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Criar requisições para {filteredCriticos.length} itens críticos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Acelerar aprovação de {filteredData.cotacoes.filter(c => c.status === 'para_aprovacao').length} cotações</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Monitorar recebimento de {filteredData.pedidos.filter(p => p.status === 'emitido').length} pedidos</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}