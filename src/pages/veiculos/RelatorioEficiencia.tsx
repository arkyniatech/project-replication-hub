import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { useVeiculosConfigStore } from '@/stores/veiculosConfigStore';
import { getRelatorioEficiencia } from '@/lib/veiculos-reports';
import { exportRelatorioEficienciaCSV } from '@/utils/veiculos-csv';
import { useMultiunidade } from '@/hooks/useMultiunidade';

export default function RelatorioEficiencia() {
  const { lojaAtual } = useMultiunidade();
  const { veiculos, postos } = useVeiculosStore();

  const [filtros, setFiltros] = useState({
    periodo: {
      inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      fim: new Date().toISOString().split('T')[0]
    },
    placa: '',
    tipo: '',
    postoId: '',
    lojaId: lojaAtual?.id || ''
  });

  const relatorio = useMemo(() => {
    return getRelatorioEficiencia(filtros);
  }, [filtros]);

  // Atualizar configurações para refletir imediatamente
  const configStore = useVeiculosConfigStore();
  const recomputed = useMemo(() => {
    return getRelatorioEficiencia(filtros);
  }, [filtros, configStore.config]);

  const handleExport = () => {
    exportRelatorioEficienciaCSV(
      recomputed.dados,
      filtros,
      lojaAtual?.nome || 'Todas'
    );
  };

  const tiposVeiculos = [...new Set(veiculos.map(v => v.tipo))];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Data Início</label>
            <Input
              type="date"
              value={filtros.periodo.inicio}
              onChange={(e) => setFiltros(prev => ({
                ...prev,
                periodo: { ...prev.periodo, inicio: e.target.value }
              }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Data Fim</label>
            <Input
              type="date"
              value={filtros.periodo.fim}
              onChange={(e) => setFiltros(prev => ({
                ...prev,
                periodo: { ...prev.periodo, fim: e.target.value }
              }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Placa</label>
            <Input
              placeholder="Filtrar por placa"
              value={filtros.placa}
              onChange={(e) => setFiltros(prev => ({ ...prev, placa: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Tipo</label>
            <Select
               value={filtros.tipo || 'all-tipos'}
               onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo: value === 'all-tipos' ? undefined : value }))}
             >
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-tipos">Todos os tipos</SelectItem>
                {tiposVeiculos.map(tipo => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Posto</label>
            <Select
               value={filtros.postoId || 'all-postos'}
               onValueChange={(value) => setFiltros(prev => ({ ...prev, postoId: value === 'all-postos' ? undefined : value }))}
             >
              <SelectTrigger>
                <SelectValue placeholder="Todos os postos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-postos">Todos os postos</SelectItem>
                {postos.map(posto => (
                  <SelectItem key={posto.id} value={posto.id}>
                    {posto.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {recomputed.kpis.mediasPorTipo.length}
            </div>
            <p className="text-xs text-muted-foreground">Tipos analisados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="text-lg font-bold">
                {recomputed.kpis.melhorVeiculo?.placa || 'N/A'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Mais eficiente ({recomputed.kpis.melhorVeiculo?.media.toFixed(1)} km/l)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <div className="text-lg font-bold">
                {recomputed.kpis.piorVeiculo?.placa || 'N/A'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Menos eficiente ({recomputed.kpis.piorVeiculo?.media.toFixed(1)} km/l)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {recomputed.dados.length}
            </div>
            <p className="text-xs text-muted-foreground">Abastecimentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Médias por Tipo */}
      {recomputed.kpis.mediasPorTipo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Médias por Tipo de Veículo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {recomputed.kpis.mediasPorTipo.map(item => (
                <div key={item.tipo} className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-xl font-bold">{item.media.toFixed(1)} km/l</div>
                  <div className="text-sm text-muted-foreground capitalize">{item.tipo}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Dados de Eficiência ({recomputed.dados.length} registros)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Posto</TableHead>
                <TableHead className="text-right">Litros</TableHead>
                <TableHead className="text-right">Km</TableHead>
                <TableHead className="text-right">Km/L</TableHead>
                <TableHead className="text-right">Custo/Km</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recomputed.dados.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {new Date(item.data).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="font-medium">{item.placa}</TableCell>
                  <TableCell>{item.posto}</TableCell>
                  <TableCell className="text-right">{item.litros.toFixed(1)} L</TableCell>
                  <TableCell className="text-right">{item.kmPercorrido} km</TableCell>
                  <TableCell className="text-right">{item.kmPorL.toFixed(1)} km/l</TableCell>
                  <TableCell className="text-right">
                    R$ {item.custoPorKm.toFixed(4)}
                  </TableCell>
                  <TableCell>
                    {item.flags !== '-' && (
                      <Badge variant="secondary" className="text-xs">
                        {item.flags}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {recomputed.dados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado no período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}