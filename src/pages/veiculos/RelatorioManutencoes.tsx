import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Wrench, Clock, DollarSign } from 'lucide-react';
import { useVeiculosStore } from '@/stores/veiculosStore';
import { getRelatorioManutencoes } from '@/lib/veiculos-reports';
import { exportRelatorioManutencoesCSV } from '@/utils/veiculos-csv';
import { useMultiunidade } from '@/hooks/useMultiunidade';

export default function RelatorioManutencoes() {
  const { lojaAtual } = useMultiunidade();
  const { veiculos, oficinas, servicos } = useVeiculosStore();

  const [filtros, setFiltros] = useState({
    periodo: {
      inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      fim: new Date().toISOString().split('T')[0]
    },
    placa: '',
    oficinaId: '',
    grupoId: '',
    servicoId: '',
    status: undefined as 'ABERTA' | 'CONCLUIDA' | undefined,
    lojaId: lojaAtual?.id || ''
  });

  const relatorio = useMemo(() => {
    return getRelatorioManutencoes(filtros);
  }, [filtros]);

  const handleExport = () => {
    exportRelatorioManutencoesCSV(
      relatorio,
      filtros,
      lojaAtual?.nome || 'Todas'
    );
  };

  const totalCusto = relatorio.reduce((sum, item) => sum + item.total, 0);
  const totalHoras = relatorio.reduce((sum, item) => sum + item.tempoParada, 0);
  const osAbertas = relatorio.filter(item => !item.saida).length;

  // Agrupar serviços por grupo para o filtro
  const gruposServicos = servicos.reduce((acc, servico) => {
    if (!acc[servico.grupo]) {
      acc[servico.grupo] = [];
    }
    acc[servico.grupo].push(servico);
    return acc;
  }, {} as Record<string, typeof servicos>);

  const grupos = Object.keys(gruposServicos);
  
  // Serviços do grupo selecionado
  const servicosDoGrupo = filtros.grupoId 
    ? gruposServicos[filtros.grupoId] || []
    : [];

  const getStatusBadge = (saida: string) => {
    if (!saida) {
      return <Badge variant="destructive">Aberta</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Concluída</Badge>;
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
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
            <label className="text-sm font-medium mb-2 block">Oficina</label>
            <Select
               value={filtros.oficinaId || 'all-oficinas'}
               onValueChange={(value) => setFiltros(prev => ({ ...prev, oficinaId: value === 'all-oficinas' ? undefined : value }))}
             >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-oficinas">Todas as oficinas</SelectItem>
                {oficinas.map(oficina => (
                  <SelectItem key={oficina.id} value={oficina.id}>
                    {oficina.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Grupo</label>
            <Select
               value={filtros.grupoId || 'all-grupos'}
               onValueChange={(value) => setFiltros(prev => ({ 
                 ...prev, 
                 grupoId: value === 'all-grupos' ? undefined : value,
                 servicoId: '' // Limpar serviço ao trocar grupo
               }))}
             >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-grupos">Todos os grupos</SelectItem>
                {grupos.map(grupo => (
                  <SelectItem key={grupo} value={grupo}>
                    {grupo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Serviço</label>
            <Select
               value={filtros.servicoId || 'all-servicos'}
               onValueChange={(value) => setFiltros(prev => ({ ...prev, servicoId: value === 'all-servicos' ? undefined : value }))}
               disabled={!filtros.grupoId || filtros.grupoId === 'all-grupos'}
             >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-servicos">Todos os serviços</SelectItem>
                {servicosDoGrupo.map(servico => (
                  <SelectItem key={servico.id} value={servico.id}>
                    {servico.servico_especifico}
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
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-blue-600" />
              <div className="text-2xl font-bold">
                {relatorio.length}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Total de OS</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div className="text-2xl font-bold">
                {osAbertas}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">OS Abertas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {totalHoras.toFixed(0)}h
            </div>
            <p className="text-xs text-muted-foreground">Tempo total parada</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="text-2xl font-bold">
                R$ {totalCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Custo total</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Manutenções e OS ({relatorio.length} registros)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº OS</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Oficina</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead className="text-right">Tempo (h)</TableHead>
                <TableHead className="text-right">Peças (R$)</TableHead>
                <TableHead className="text-right">MO (R$)</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatorio.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.numeroOS}</TableCell>
                  <TableCell>{item.veiculo}</TableCell>
                  <TableCell>{item.oficina}</TableCell>
                  <TableCell>{item.servico}</TableCell>
                  <TableCell>
                    {new Date(item.entrada).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {item.saida ? new Date(item.saida).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell className="text-right">{item.tempoParada.toFixed(1)}h</TableCell>
                  <TableCell className="text-right">
                    R$ {item.custoPecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {item.custoMO.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.saida)}
                  </TableCell>
                </TableRow>
              ))}
              {relatorio.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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