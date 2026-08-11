import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, CheckCircle, AlertTriangle, Package, Archive, TrendingDown, FileText } from 'lucide-react';
import { useSupabaseCatalogo } from '@/modules/almox/hooks/useSupabaseCatalogo';
import { useSupabaseEstoque } from '@/modules/almox/hooks/useSupabaseEstoque';
import { useSupabaseMovimentos } from '@/modules/almox/hooks/useSupabaseMovimentos';
import { useSupabaseRequisicoes } from '@/modules/compras/hooks/useSupabaseRequisicoes';
import { useSupabaseCotacoes } from '@/modules/compras/hooks/useSupabaseCotacoes';
import { useSupabasePedidosCompra } from '@/modules/compras/hooks/useSupabasePedidosCompra';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { useRbac } from '@/hooks/useRbac';

const ENTRADA_TIPOS = ['ENTRADA_PO', 'AJUSTE_POSITIVO', 'DEVOLUCAO_FORNECEDOR', 'TRANSFERENCIA_ENTRADA'];
const SAIDA_TIPOS = ['CONSUMO', 'AJUSTE_NEGATIVO', 'BAIXA_PATRIMONIAL', 'TRANSFERENCIA_SAIDA'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function PainelUnificado() {
  const { can } = useRbac();
  const { lojaAtual, lojasPermitidas } = useMultiunidade();
  const [filtroOrigem, setFiltroOrigem] = useState<string>('all');
  const [selectedLoja, setSelectedLoja] = useState<string>('');

  const lojaId = selectedLoja || lojaAtual?.id;

  const { itens: catalogoItens } = useSupabaseCatalogo();
  const { estoque: estoqueLoja } = useSupabaseEstoque(lojaId);
  const { movimentos } = useSupabaseMovimentos(lojaId);
  const { requisicoes } = useSupabaseRequisicoes(lojaId);
  const { cotacoes } = useSupabaseCotacoes(lojaId);
  const { pedidos } = useSupabasePedidosCompra(lojaId);

  const canViewPatrimonial = can('almox:patrimonial');

  const catalogoVisivel = useMemo(
    () => canViewPatrimonial ? catalogoItens : catalogoItens.filter(i => i.tipo !== 'PATRIMONIAL'),
    [catalogoItens, canViewPatrimonial]
  );

  // Itens em estoque crítico (saldo <= mínimo) — real
  const filteredCriticos = useMemo(
    () => estoqueLoja.filter(e =>
      e.item && e.item.estoque_minimo != null && e.saldo <= e.item.estoque_minimo &&
      (canViewPatrimonial || e.item.tipo !== 'PATRIMONIAL')
    ),
    [estoqueLoja, canViewPatrimonial]
  );

  // KPIs de catálogo — reais
  const totalItens = catalogoVisivel.length;
  const itensAtivos = catalogoVisivel.filter(i => i.ativo).length;

  // Distribuição por tipo — real
  const breakdownData = useMemo(() => {
    const base = [
      { name: 'Peças', value: catalogoItens.filter(i => i.tipo === 'PECA').length, color: '#0088FE' },
      { name: 'Consumíveis', value: catalogoItens.filter(i => i.tipo === 'CONSUMIVEL').length, color: '#00C49F' },
    ];
    if (canViewPatrimonial) {
      base.push({ name: 'Patrimonial', value: catalogoItens.filter(i => i.tipo === 'PATRIMONIAL').length, color: '#FFBB28' });
    }
    return base.filter(b => b.value > 0);
  }, [catalogoItens, canViewPatrimonial]);

  // Movimentação de estoque por mês (últimos 6 meses) — real
  const movimentacaoData = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; mes: string; entradas: number; saidas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, mes: MESES[d.getMonth()], entradas: 0, saidas: 0 });
    }
    for (const m of movimentos) {
      const d = new Date(m.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.find(b => b.key === key);
      if (!bucket) continue;
      const qtd = Math.abs(Number(m.quantidade));
      if (ENTRADA_TIPOS.includes(m.tipo)) bucket.entradas += qtd;
      else if (SAIDA_TIPOS.includes(m.tipo)) bucket.saidas += qtd;
    }
    return buckets;
  }, [movimentos]);

  // Cobertura de peças críticas: % de peças com saldo >= mínimo — real
  const coberturaItensCriticos = useMemo(() => {
    const pecas = catalogoItens.filter(i => i.tipo === 'PECA' && i.estoque_minimo != null);
    if (pecas.length === 0) return 100;
    const comCobertura = pecas.filter(p => {
      const saldo = estoqueLoja.find(e => e.item_id === p.id)?.saldo ?? 0;
      return saldo >= (p.estoque_minimo ?? 0);
    }).length;
    return Math.round((comCobertura / pecas.length) * 100);
  }, [catalogoItens, estoqueLoja]);

  // Rupturas no mês: itens com saída no mês corrente e saldo atual zerado — real
  const rupturasMes = useMemo(() => {
    const now = new Date();
    const itensComSaida = new Set<string>();
    for (const m of movimentos) {
      const d = new Date(m.created_at);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && SAIDA_TIPOS.includes(m.tipo)) {
        itensComSaida.add(m.item_id);
      }
    }
    let count = 0;
    itensComSaida.forEach(id => {
      const saldo = estoqueLoja.find(e => e.item_id === id)?.saldo ?? 0;
      if (saldo <= 0) count++;
    });
    return count;
  }, [movimentos, estoqueLoja]);

  // Compras — métricas reais
  const cobertura2Fornecedores = cotacoes.length
    ? Math.round((cotacoes.filter(c => c.propostas.length >= 2).length / cotacoes.length) * 100)
    : 0;
  const aprovacoes1Tentativa = cotacoes.length
    ? Math.round((cotacoes.filter(c => c.status === 'aprovado' || c.status === 'comprado').length / cotacoes.length) * 100)
    : 0;
  const cotacoesPedidoPecas = cotacoes.filter(c => c.origem === 'OS');
  const requisicoesAbertas = requisicoes.filter(r => r.status === 'solicitado' || r.status === 'em_cotacao').length;

  const filteredCotacoes = filtroOrigem === 'all' ? cotacoes : cotacoes.filter(c => c.origem === filtroOrigem);
  const filteredPedidos = filtroOrigem === 'all' ? pedidos : pedidos.filter(p => p.cotacao?.origem === filtroOrigem);
  const pedidosAguardando = pedidos.filter(p => p.status === 'emitido' || p.status === 'parcial').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Compras & Estoque</h1>
          <p className="text-muted-foreground">Visão integrada de compras, almoxarifado e performance do estoque</p>
        </div>

        <div className="flex gap-2">
          <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Origens</SelectItem>
              <SelectItem value="OS">Pedidos de Peças (OS)</SelectItem>
              <SelectItem value="REQ">Requisições</SelectItem>
              <SelectItem value="DIRETA">Diretas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={lojaId || ''} onValueChange={setSelectedLoja}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Loja" /></SelectTrigger>
            <SelectContent>
              {lojasPermitidas.map((l: any) => (
                <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="estoque" className="w-full">
        <TabsList>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="integrado">Visão Integrada</TabsTrigger>
        </TabsList>

        <TabsContent value="compras" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cobertura ≥2 Fornecedores</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cobertura2Fornecedores}%</div>
                <p className="text-xs text-muted-foreground">das cotações com 2+ propostas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aprovacoes1Tentativa}%</div>
                <p className="text-xs text-muted-foreground">cotações aprovadas/compradas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos de Peças (OS)</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cotacoesPedidoPecas.length}</div>
                <p className="text-xs text-muted-foreground">cotações originadas da Oficina</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requisições Abertas</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{requisicoesAbertas}</div>
                <p className="text-xs text-muted-foreground">solicitadas / em cotação</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Status dos Processos</CardTitle></CardHeader>
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
                  <div className="text-lg font-bold">{filteredCotacoes.length}</div>
                  <div className="text-sm text-muted-foreground">Cotações</div>
                  <Badge className="bg-yellow-100 text-yellow-800 mt-1">
                    {filteredCotacoes.filter(c => c.status === 'para_aprovacao').length} P/ Aprovação
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{filteredPedidos.length}</div>
                  <div className="text-sm text-muted-foreground">Pedidos</div>
                  <Badge className="bg-green-100 text-green-800 mt-1">
                    {filteredPedidos.filter(p => p.status === 'emitido').length} Emitidos
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estoque" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Itens com Estoque Crítico</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{filteredCriticos.length}</div>
                <p className="text-xs text-muted-foreground">Abaixo do mínimo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cobertura Peças Críticas</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coberturaItensCriticos}%</div>
                <p className="text-xs text-muted-foreground">peças com saldo ≥ mínimo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rupturas no Mês</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rupturasMes}</div>
                <p className="text-xs text-muted-foreground">itens zerados após saída no mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
                <Archive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalItens}</div>
                <p className="text-xs text-muted-foreground">{itensAtivos} ativos</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Distribuição por Tipo</CardTitle></CardHeader>
              <CardContent>
                {breakdownData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">Sem itens cadastrados</p>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      cx="50%" cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
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
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Movimentação de Estoque</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={movimentacaoData}>
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
                          <span className="font-medium">{item.item?.sku}</span>
                          <Badge className={
                            item.item?.tipo === 'PECA' ? 'bg-blue-100 text-blue-800' :
                            item.item?.tipo === 'CONSUMIVEL' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }>
                            {item.item?.tipo}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.item?.descricao}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm"><span className="font-medium text-red-600">Atual: {item.saldo}</span></div>
                        <div className="text-sm text-muted-foreground">Mín: {item.item?.estoque_minimo}</div>
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
            <CardHeader><CardTitle>Integração Compras ↔ Estoque</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Indicadores</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Pedidos aguardando recebimento</span>
                      <span className="font-medium">{pedidosAguardando}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Itens em estoque crítico</span>
                      <span className="font-medium text-red-600">{filteredCriticos.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cotações de pedidos de peças (OS)</span>
                      <span className="font-medium text-green-600">{cotacoesPedidoPecas.length}</span>
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
                      <span>Acelerar aprovação de {filteredCotacoes.filter(c => c.status === 'para_aprovacao').length} cotações</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Monitorar recebimento de {filteredPedidos.filter(p => p.status === 'emitido').length} pedidos</span>
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
