import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Clock, TrendingUp, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { useComprasStore } from '@/modules/compras/store/comprasStore';

// Mock data for charts
const leadTimeData = [
  { week: 'S1', reqToCot: 2.1, cotToAprov: 1.8, aprovToPo: 0.5, poToReceb: 6.2 },
  { week: 'S2', reqToCot: 1.9, cotToAprov: 1.2, aprovToPo: 0.8, poToReceb: 7.1 },
  { week: 'S3', reqToCot: 2.3, cotToAprov: 1.5, aprovToPo: 0.6, poToReceb: 5.8 },
  { week: 'S4', reqToCot: 2.0, cotToAprov: 1.4, aprovToPo: 0.7, poToReceb: 8.2 },
];

const fornecedorData = [
  { fornecedor: 'ABC Peças', leadTime: 5.2, pedidos: 12 },
  { fornecedor: 'XYZ Equipamentos', leadTime: 7.8, pedidos: 8 },
  { fornecedor: 'Tech Supply', leadTime: 4.1, pedidos: 15 },
  { fornecedor: 'Parts & More', leadTime: 6.3, pedidos: 6 },
];

export default function PainelCompras() {
  const { 
    getLeadTimePorEtapa, 
    getPercentualCobertura2Fornecedores,
    getCotacoesDePedidoDePecas,
    cotacoes,
    pedidosCompra,
    requisicoes
  } = useComprasStore();
  
  const [filtroOrigem, setFiltroOrigem] = useState<string>('all');
  
  const leadTimes = getLeadTimePorEtapa();
  const cobertura2Fornecedores = getPercentualCobertura2Fornecedores();
  const cotacoesPedidoPecas = getCotacoesDePedidoDePecas();
  
  // Calculate KPIs
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
          <h1 className="text-3xl font-bold tracking-tight">Painel de Compras</h1>
          <p className="text-muted-foreground">
            Acompanhe KPIs e performance do processo de compras
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
        </div>
      </div>

      {/* KPI Cards */}
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

        {/* Supplier Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance por Fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fornecedorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="fornecedor" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="leadTime" fill="#8884d8" name="Lead Time (dias)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Requisições</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total</span>
                <Badge variant="outline">{requisicoes.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Em Cotação</span>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {requisicoes.filter(r => r.status === 'em_cotacao').length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Solicitadas</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {requisicoes.filter(r => r.status === 'solicitado').length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cotações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total</span>
                <Badge variant="outline">{filteredData.cotacoes.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Para Aprovação</span>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {filteredData.cotacoes.filter(c => c.status === 'para_aprovacao').length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Aprovadas</span>
                <Badge className="bg-green-100 text-green-800">
                  {filteredData.cotacoes.filter(c => c.status === 'aprovado').length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pedidos de Compra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total</span>
                <Badge variant="outline">{filteredData.pedidos.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Emitidos</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {filteredData.pedidos.filter(p => p.status === 'emitido').length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Recebidos</span>
                <Badge className="bg-green-100 text-green-800">
                  {filteredData.pedidos.filter(p => p.status === 'total').length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      {filtroOrigem === 'OS' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Análise Específica - Pedidos de Peças
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Performance da Oficina</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Lead Time Azul → Verde</span>
                    <span className="font-medium">2.1 dias</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Equipamentos Parados</span>
                    <span className="font-medium text-red-600">3 itens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Pedidos Urgentes</span>
                    <span className="font-medium text-yellow-600">
                      {cotacoesPedidoPecas.filter(c => c.itens.some(i => i.obs && i.obs.includes('urgente'))).length}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Ações Recomendadas</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Priorizar cotações com equipamentos críticos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>Revisar fornecedores com lead time maior que 7 dias</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Implementar estoque de segurança para peças críticas</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}