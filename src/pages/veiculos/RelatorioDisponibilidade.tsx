import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Activity, AlertTriangle } from 'lucide-react';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { getRelatorioDisponibilidade } from '@/lib/veiculos-reports';
import { exportRelatorioDisponibilidadeCSV } from '@/utils/veiculos-csv';
import { useMultiunidade } from '@/hooks/useMultiunidade';

export default function RelatorioDisponibilidade() {
  const { lojaAtual } = useMultiunidade();
  const { veiculos } = useVeiculosStore();

  const [filtros, setFiltros] = useState({
    periodo: {
      inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      fim: new Date().toISOString().split('T')[0]
    },
    placa: '',
    lojaId: lojaAtual?.id || ''
  });

  const relatorio = useMemo(() => {
    return getRelatorioDisponibilidade(filtros);
  }, [filtros]);

  const handleExport = () => {
    exportRelatorioDisponibilidadeCSV(
      relatorio,
      filtros,
      lojaAtual?.nome || 'Todas'
    );
  };

  const mediaDisponibilidade = relatorio.length > 0 
    ? relatorio.reduce((sum, item) => sum + item.disponibilidade, 0) / relatorio.length
    : 0;

  const veiculosComBaixaDisponibilidade = relatorio.filter(item => item.disponibilidade < 80).length;
  const totalHorasOficina = relatorio.reduce((sum, item) => sum + item.horasOficina, 0);

  const getDisponibilidadeBadge = (disponibilidade: number) => {
    if (disponibilidade >= 95) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Excelente</Badge>;
    } else if (disponibilidade >= 80) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Boa</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Baixa</Badge>;
    }
  };

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
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div className="text-2xl font-bold">
                {mediaDisponibilidade.toFixed(1)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Disponibilidade média</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="text-2xl font-bold">
                {veiculosComBaixaDisponibilidade}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Veículos com baixa disponibilidade (&lt;80%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {totalHorasOficina.toFixed(0)}h
            </div>
            <p className="text-xs text-muted-foreground">Total horas em oficina</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {relatorio.length}
            </div>
            <p className="text-xs text-muted-foreground">Veículos analisados</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Disponibilidade por Veículo ({relatorio.length} registros)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Veículo</TableHead>
                <TableHead className="text-right">Horas Operando</TableHead>
                <TableHead className="text-right">Horas em Oficina</TableHead>
                <TableHead className="text-right">Disponibilidade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatorio.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.veiculo}</TableCell>
                  <TableCell className="text-right">
                    {item.horasOperando.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-right">
                    {item.horasOficina.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.disponibilidade.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    {getDisponibilidadeBadge(item.disponibilidade)}
                  </TableCell>
                </TableRow>
              ))}
              {relatorio.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado no período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resumo por Faixa de Disponibilidade */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Faixa de Disponibilidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-800">
                {relatorio.filter(item => item.disponibilidade >= 95).length}
              </div>
              <div className="text-sm text-green-600">Excelente (≥95%)</div>
            </div>

            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-800">
                {relatorio.filter(item => item.disponibilidade >= 80 && item.disponibilidade < 95).length}
              </div>
              <div className="text-sm text-yellow-600">Boa (80-94%)</div>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-800">
                {relatorio.filter(item => item.disponibilidade < 80).length}
              </div>
              <div className="text-sm text-red-600">Baixa (&lt;80%)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}