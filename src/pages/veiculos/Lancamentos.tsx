import { useState, useMemo } from 'react';
import { Plus, Filter, Download, Car, Droplets, Wrench, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { format, isToday, isThisMonth, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { AbastecimentoForm } from '@/components/veiculos/AbastecimentoForm';
import { TrocaOleoForm } from '@/components/veiculos/TrocaOleoForm';
import { ManutencaoForm } from '@/components/veiculos/ManutencaoForm';
import { toast } from 'sonner';

type TipoLancamento = 'abastecimentos' | 'trocas_oleo' | 'manutencoes';

export default function Lancamentos() {
  const { 
    veiculos, 
    abastecimentos, 
    trocas_oleo, 
    manutencoes, 
    postos, 
    oleos, 
    oficinas
  } = useVeiculosStore();

  const [activeTab, setActiveTab] = useState<TipoLancamento>('abastecimentos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVeiculo, setSelectedVeiculo] = useState<string>('all');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('mes_atual');
  
  // Estados dos modals
  const [abastecimentoModalOpen, setAbastecimentoModalOpen] = useState(false);
  const [trocaOleoModalOpen, setTrocaOleoModalOpen] = useState(false);
  const [manutencaoModalOpen, setManutencaoModalOpen] = useState(false);

  // Filtros por período
  const getDateRange = (periodo: string) => {
    const today = new Date();
    switch (periodo) {
      case 'hoje':
        return { start: today, end: today };
      case 'mes_atual':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'mes_anterior':
        const lastMonth = subMonths(today, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      default:
        return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  };

  const { start: dateStart, end: dateEnd } = getDateRange(selectedPeriodo);

  // Filtrar dados
  const filteredData = useMemo(() => {
    const filterByDateAndVeiculo = (items: any[], dateField: string = 'data') => {
      return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        const inDateRange = itemDate >= dateStart && itemDate <= dateEnd;
        const matchesVeiculo = selectedVeiculo === 'all' || item.veiculo_id === selectedVeiculo;
        
        if (!searchTerm) return inDateRange && matchesVeiculo;
        
        const veiculo = veiculos.find(v => v.id === item.veiculo_id);
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = veiculo?.placa.toLowerCase().includes(searchLower) ||
                            veiculo?.modelo.toLowerCase().includes(searchLower) ||
                            veiculo?.codigo_interno.toLowerCase().includes(searchLower);
        
        return inDateRange && matchesVeiculo && matchesSearch;
      });
    };

    return {
      abastecimentos: filterByDateAndVeiculo(abastecimentos),
      trocas_oleo: filterByDateAndVeiculo(trocas_oleo),
      manutencoes: filterByDateAndVeiculo(manutencoes, 'data_abertura')
    };
  }, [abastecimentos, trocas_oleo, manutencoes, dateStart, dateEnd, selectedVeiculo, searchTerm, veiculos]);

  // KPIs
  const kpis = useMemo(() => {
    const totalAbastecimentos = filteredData.abastecimentos.length;
    const custoAbastecimentos = filteredData.abastecimentos.reduce((sum, item) => 
      sum + (item.preco_litro * item.litros), 0
    );
    
    const totalTrocasOleo = filteredData.trocas_oleo.length;
    const custoTrocasOleo = filteredData.trocas_oleo.reduce((sum, item) => 
      sum + (item.custo_total || 0), 0
    );
    
    const totalManutencoes = filteredData.manutencoes.length;
    const manutencoesConcluidas = filteredData.manutencoes.filter(m => m.status === 'CONCLUIDA').length;
    const custoManutencoes = filteredData.manutencoes.reduce((sum, item) => 
      sum + (item.custo_pecas || 0) + (item.custo_mo || 0), 0
    );

    const consumoMedio = filteredData.abastecimentos.length > 0 
      ? filteredData.abastecimentos.reduce((sum, item) => sum + item.km_por_l, 0) / filteredData.abastecimentos.length
      : 0;

    return {
      totalLancamentos: totalAbastecimentos + totalTrocasOleo + totalManutencoes,
      custoTotal: custoAbastecimentos + custoTrocasOleo + custoManutencoes,
      consumoMedio,
      manutencoesConcluidas,
      totalManutencoes
    };
  }, [filteredData]);

  const handleExport = () => {
    toast.success('Exportação iniciada! Arquivo será baixado em breve.');
  };

  const handleModalSuccess = () => {
    setAbastecimentoModalOpen(false);
    setTrocaOleoModalOpen(false);
    setManutencaoModalOpen(false);
    toast.success('Lançamento registrado com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lançamentos</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalLancamentos}</div>
            <p className="text-xs text-muted-foreground">
              No período selecionado
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              }).format(kpis.custoTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Combustível + Óleo + Manutenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consumo Médio</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.consumoMedio.toFixed(1)} km/l
            </div>
            <p className="text-xs text-muted-foreground">
              Média dos abastecimentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manutenções</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.manutencoesConcluidas}/{kpis.totalManutencoes}
            </div>
            <p className="text-xs text-muted-foreground">
              Concluídas/Total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por placa, modelo ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={selectedVeiculo} onValueChange={setSelectedVeiculo}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os veículos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os veículos</SelectItem>
                {veiculos.map(veiculo => (
                  <SelectItem key={veiculo.id} value={veiculo.id}>
                    {veiculo.placa} - {veiculo.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="mes_atual">Mês Atual</SelectItem>
                <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Abas de Lançamentos */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lançamentos Operacionais</CardTitle>
            <div className="flex gap-2">
              {activeTab === 'abastecimentos' && (
                <Button onClick={() => setAbastecimentoModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Abastecimento
                </Button>
              )}
              {activeTab === 'trocas_oleo' && (
                <Button onClick={() => setTrocaOleoModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Troca de Óleo
                </Button>
              )}
              {activeTab === 'manutencoes' && (
                <Button onClick={() => setManutencaoModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Abrir OS
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TipoLancamento)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="abastecimentos" className="flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Abastecimentos ({filteredData.abastecimentos.length})
              </TabsTrigger>
              <TabsTrigger value="trocas_oleo" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Trocas de Óleo ({filteredData.trocas_oleo.length})
              </TabsTrigger>
              <TabsTrigger value="manutencoes" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Manutenções ({filteredData.manutencoes.length})
              </TabsTrigger>
            </TabsList>

            {/* Tabela de Abastecimentos */}
            <TabsContent value="abastecimentos" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Posto</TableHead>
                    <TableHead>Litros</TableHead>
                    <TableHead>Preço/L</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>KM/L</TableHead>
                    <TableHead>KM Atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.abastecimentos.map((abastecimento) => {
                    const veiculo = veiculos.find(v => v.id === abastecimento.veiculo_id);
                    const posto = postos.find(p => p.id === abastecimento.posto_id);
                    const total = abastecimento.litros * abastecimento.preco_litro;
                    
                    return (
                      <TableRow key={abastecimento.id}>
                        <TableCell>
                          {format(new Date(abastecimento.data), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{veiculo?.placa}</div>
                            <div className="text-sm text-muted-foreground">{veiculo?.modelo}</div>
                          </div>
                        </TableCell>
                        <TableCell>{posto?.nome}</TableCell>
                        <TableCell>{abastecimento.litros.toFixed(1)}L</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(abastecimento.preco_litro)}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {abastecimento.km_por_l.toFixed(1)} km/l
                            {abastecimento.km_por_l < 8 && (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{abastecimento.km_atual.toLocaleString()} km</TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredData.abastecimentos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum abastecimento encontrado no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Tabela de Trocas de Óleo */}
            <TabsContent value="trocas_oleo" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Tipo de Óleo</TableHead>
                    <TableHead>KM Atual</TableHead>
                    <TableHead>KM desde Última</TableHead>
                    <TableHead>Custo Total</TableHead>
                    <TableHead>Filtros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.trocas_oleo.map((trocaOleo) => {
                    const veiculo = veiculos.find(v => v.id === trocaOleo.veiculo_id);
                    const oleo = oleos.find(o => o.id === trocaOleo.oleo_id);
                    
                    return (
                      <TableRow key={trocaOleo.id}>
                        <TableCell>
                          {format(new Date(trocaOleo.data), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{veiculo?.placa}</div>
                            <div className="text-sm text-muted-foreground">{veiculo?.modelo}</div>
                          </div>
                        </TableCell>
                        <TableCell>{oleo?.tipo_especificacao}</TableCell>
                        <TableCell>{trocaOleo.km_atual.toLocaleString()} km</TableCell>
                        <TableCell>{trocaOleo.km_desde_ultima.toLocaleString()} km</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          }).format(trocaOleo.custo_total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {trocaOleo.trocou_filtro && (
                              <Badge variant="secondary" className="text-xs">Óleo</Badge>
                            )}
                            {trocaOleo.trocou_filtro_combustivel && (
                              <Badge variant="secondary" className="text-xs">Combustível</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredData.trocas_oleo.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma troca de óleo encontrada no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Tabela de Manutenções */}
            <TabsContent value="manutencoes" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Abertura</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Oficina</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tempo Parado</TableHead>
                    <TableHead>Custo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.manutencoes.map((manutencao) => {
                    const veiculo = veiculos.find(v => v.id === manutencao.veiculo_id);
                    const oficina = oficinas.find(o => o.id === manutencao.oficina_id);
                    const custoTotal = (manutencao.custo_pecas || 0) + (manutencao.custo_mo || 0);
                    
                    return (
                      <TableRow key={manutencao.id}>
                        <TableCell>
                          {format(new Date(manutencao.data_abertura), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{veiculo?.placa}</div>
                            <div className="text-sm text-muted-foreground">{veiculo?.modelo}</div>
                          </div>
                        </TableCell>
                        <TableCell>{oficina?.nome}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {manutencao.descricao || 'Manutenção geral'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={manutencao.status === 'CONCLUIDA' ? 'default' : 'secondary'}
                          >
                            {manutencao.status === 'CONCLUIDA' ? 'Concluída' : 'Em andamento'}
                          </Badge>
                        </TableCell>
                        <TableCell>{manutencao.tempo_parado_h}h</TableCell>
                        <TableCell>
                          {custoTotal > 0 ? (
                            new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(custoTotal)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredData.manutencoes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma manutenção encontrada no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modals */}
      <AbastecimentoForm
        open={abastecimentoModalOpen}
        onOpenChange={setAbastecimentoModalOpen}
        onSuccess={handleModalSuccess}
      />
      
      <TrocaOleoForm
        open={trocaOleoModalOpen}
        onOpenChange={setTrocaOleoModalOpen}
        onSuccess={handleModalSuccess}
      />
      
      <ManutencaoForm
        open={manutencaoModalOpen}
        onOpenChange={setManutencaoModalOpen}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}