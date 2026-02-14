import { useState, useMemo } from 'react';
import { Search, Filter, Car, Truck, Bike, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { VeiculoForm } from '@/components/veiculos/VeiculoForm';
import { FleetKPICards } from '@/components/veiculos/FleetKPICards';
import { FleetGrid } from '@/components/veiculos/FleetGrid';
import { AbastecimentoForm } from '@/components/veiculos/AbastecimentoForm';
import { ManutencaoForm } from '@/components/veiculos/ManutencaoForm';
import { TrocaOleoForm } from '@/components/veiculos/TrocaOleoForm';
import { 
  TIPO_VEICULO_LABELS, 
  STATUS_VEICULO_LABELS, 
  STATUS_COLORS,
  formatPlaca,
  formatOdometro
} from '@/lib/veiculos-utils';
import { TipoVeiculo, StatusVeiculo, FiltrosVeiculos } from '@/types/veiculos';
import type { DateRange } from 'react-day-picker';

const TIPO_ICONS = {
  carro: Car,
  moto: Bike,
  furgão: Package,
  caminhão: Truck,
};

export default function Veiculos() {
  const { veiculos, getVeiculosByLoja } = useVeiculosStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosVeiculos>({});

  // Mock da loja ativa - em produção viria do contexto
  const lojaAtiva = '1';

  // Estado para range de datas
  const [periodo, setPeriodo] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });

  // Estados para modais de ações rápidas
  const [showAbastecimento, setShowAbastecimento] = useState(false);
  const [showManutencao, setShowManutencao] = useState(false);
  const [showTrocaOleo, setShowTrocaOleo] = useState(false);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string>('');

  const veiculosFiltrados = useMemo(() => {
    let result = getVeiculosByLoja(lojaAtiva);

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      result = result.filter(v => 
        v.placa.toLowerCase().includes(busca) ||
        v.codigo_interno.toLowerCase().includes(busca) ||
        v.fabricante.toLowerCase().includes(busca) ||
        v.modelo.toLowerCase().includes(busca)
      );
    }

    if (filtros.status) {
      result = result.filter(v => v.status === filtros.status);
    }

    if (filtros.tipo) {
      result = result.filter(v => v.tipo === filtros.tipo);
    }

    return result.sort((a, b) => a.placa.localeCompare(b.placa));
  }, [getVeiculosByLoja, lojaAtiva, filtros]);

  const stats = useMemo(() => {
    const veiculosLoja = getVeiculosByLoja(lojaAtiva);
    return {
      total: veiculosLoja.length,
      operando: veiculosLoja.filter(v => v.status === 'OPERANDO').length,
      oficina: veiculosLoja.filter(v => v.status === 'OFICINA').length,
      baixado: veiculosLoja.filter(v => v.status === 'BAIXADO').length,
    };
  }, [getVeiculosByLoja, lojaAtiva]);

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  // Handlers para ações rápidas do Grid Operacional
  const handleAbastecimento = (veiculoId: string) => {
    setSelectedVeiculoId(veiculoId);
    setShowAbastecimento(true);
  };

  const handleManutencao = (veiculoId: string) => {
    setSelectedVeiculoId(veiculoId);
    setShowManutencao(true);
  };

  const handleTrocaOleo = (veiculoId: string) => {
    setSelectedVeiculoId(veiculoId);
    setShowTrocaOleo(true);
  };

  return (
    <div className="space-y-6">
      {/* Filtros Globais */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Loja</label>
          <Select value={lojaAtiva}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar loja" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Loja Central</SelectItem>
              <SelectItem value="2">Filial Norte</SelectItem>
              <SelectItem value="3">Filial Sul</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Período</label>
          <DatePickerWithRange
            date={periodo}
            onDateChange={setPeriodo}
          />
        </div>
      </div>

      {/* KPIs Básicos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Car className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Operando</p>
                <p className="text-2xl font-bold text-green-600">{stats.operando}</p>
              </div>
              <div className="h-3 w-3 rounded-full bg-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Oficina</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.oficina}</p>
              </div>
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Baixado</p>
                <p className="text-2xl font-bold text-red-600">{stats.baixado}</p>
              </div>
              <div className="h-3 w-3 rounded-full bg-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Detalhados */}
      <FleetKPICards 
        lojaId={lojaAtiva} 
        periodo={periodo && periodo.from && periodo.to ? {
          inicio: periodo.from.toISOString().split('T')[0],
          fim: periodo.to.toISOString().split('T')[0]
        } : undefined}
      />

      {/* Tabs Principal */}
      <Tabs defaultValue="lista" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lista">Lista de Veículos</TabsTrigger>
          <TabsTrigger value="operacional">Grid Operacional</TabsTrigger>
        </TabsList>
        
        <TabsContent value="lista" className="space-y-6 mt-6">

          {/* Filtros */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Filtros</CardTitle>
                <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar por placa, código, fabricante ou modelo..."
                      value={filtros.busca || ''}
                      onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                       <Select 
                         value={filtros.status || 'all-status'} 
                         onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value === 'all-status' ? undefined : (value as StatusVeiculo) }))}
                       >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-status">Todos os status</SelectItem>
                          {Object.entries(STATUS_VEICULO_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Tipo</label>
                       <Select 
                         value={filtros.tipo || 'all-tipos'} 
                         onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo: value === 'all-tipos' ? undefined : (value as TipoVeiculo) }))}
                       >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os tipos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-tipos">Todos os tipos</SelectItem>
                          {Object.entries(TIPO_VEICULO_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle>Veículos ({veiculosFiltrados.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placa</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Odômetro</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {veiculosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum veículo encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      veiculosFiltrados.map((veiculo) => {
                        const TipoIcon = TIPO_ICONS[veiculo.tipo];
                        return (
                          <TableRow key={veiculo.id} className="hover:bg-muted/50">
                            <TableCell className="font-mono font-medium">
                              {formatPlaca(veiculo.placa)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {veiculo.codigo_interno}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TipoIcon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{veiculo.fabricante} {veiculo.modelo}</div>
                                  <div className="text-sm text-muted-foreground">{veiculo.ano_fab}/{veiculo.ano_mod}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {TIPO_VEICULO_LABELS[veiculo.tipo]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={STATUS_COLORS[veiculo.status]}>
                                {STATUS_VEICULO_LABELS[veiculo.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatOdometro(veiculo.odometro_atual)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(veiculo.id)}
                              >
                                Editar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="operacional" className="space-y-6 mt-6">
          {/* Grid Operacional */}
          <FleetGrid
            onAbastecimento={handleAbastecimento}
            onManutencao={handleManutencao}
            onTrocaOleo={handleTrocaOleo}
          />
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <VeiculoForm
        open={showForm}
        onOpenChange={setShowForm}
        veiculoId={editingId}
        onSuccess={handleCloseForm}
      />

      <AbastecimentoForm
        open={showAbastecimento}
        onOpenChange={(open) => {
          setShowAbastecimento(open);
          if (!open) setSelectedVeiculoId('');
        }}
        veiculoIdProp={selectedVeiculoId}
        onSuccess={() => {
          setShowAbastecimento(false);
          setSelectedVeiculoId('');
        }}
      />

      <ManutencaoForm
        open={showManutencao}
        onOpenChange={(open) => {
          setShowManutencao(open);
          if (!open) setSelectedVeiculoId('');
        }}
        veiculoIdProp={selectedVeiculoId}
        onSuccess={() => {
          setShowManutencao(false);
          setSelectedVeiculoId('');
        }}
      />

      <TrocaOleoForm
        open={showTrocaOleo}
        onOpenChange={(open) => {
          setShowTrocaOleo(open);
          if (!open) setSelectedVeiculoId('');
        }}
        veiculoIdProp={selectedVeiculoId}
        onSuccess={() => {
          setShowTrocaOleo(false);
          setSelectedVeiculoId('');
        }}
      />
    </div>
  );
}