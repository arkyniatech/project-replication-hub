import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, DollarSign } from 'lucide-react';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { getRelatorioCustos } from '@/lib/veiculos-reports';
import { exportRelatorioCustosCSV } from '@/utils/veiculos-csv';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RelatorioCustos() {
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
    return getRelatorioCustos(filtros);
  }, [filtros]);

  const handleExport = () => {
    exportRelatorioCustosCSV(
      relatorio,
      filtros,
      lojaAtual?.nome || 'Todas'
    );
  };

  const totalGeral = relatorio.reduce((sum, item) => sum + item.total, 0);
  const totalCombustivel = relatorio.reduce((sum, item) => sum + item.combustivel, 0);
  const totalManutencao = relatorio.reduce((sum, item) => sum + item.manutencao, 0);

  // Dados para o gráfico (Top 10)
  const dadosGrafico = relatorio
    .slice(0, 10)
    .map(item => ({
      veiculo: item.veiculo.split(' - ')[0], // Apenas a placa
      Combustível: item.combustivel,
      Manutenção: item.manutencao
    }));

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
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="text-2xl font-bold">
                R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Custo total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              R$ {totalCombustivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Combustível ({totalGeral > 0 ? ((totalCombustivel / totalGeral) * 100).toFixed(0) : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              R$ {totalManutencao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Manutenção ({totalGeral > 0 ? ((totalManutencao / totalGeral) * 100).toFixed(0) : 0}%)
            </p>
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

      {/* Gráfico */}
      {dadosGrafico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custos por Veículo (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="veiculo" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tickFormatter={(value) => 
                      `R$ ${value.toLocaleString('pt-BR')}`
                    }
                  />
                  <Tooltip 
                    formatter={(value: any) => 
                      [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']
                    }
                  />
                  <Legend />
                  <Bar dataKey="Combustível" fill="#3b82f6" />
                  <Bar dataKey="Manutenção" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Custos por Veículo ({relatorio.length} registros)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Veículo</TableHead>
                <TableHead className="text-right">Combustível (R$)</TableHead>
                <TableHead className="text-right">Manutenção (R$)</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
                <TableHead className="text-right">R$/Km</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatorio.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.veiculo}</TableCell>
                  <TableCell className="text-right">
                    R$ {item.combustivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {item.manutencao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {item.custoPorKm.toFixed(4)}
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
    </div>
  );
}