import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, AlertCircle, CheckCircle2, Download, Filter, Eye } from 'lucide-react';
import { useRhStore } from '../../store/rhStore';
import { buildJornadaKPIs, formatHours } from '../../utils/seedRhMissing8';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function RelatorioJornada() {
  const { toast } = useToast();
  const { pontoMarcacoes, ajustesPonto, pessoas } = useRhStore();
  const [filtros, setFiltros] = useState({
    competencia: format(new Date(), 'yyyy-MM'),
    loja: 'all',
    cc: 'all'
  });
  const [ajusteDetalhes, setAjusteDetalhes] = useState<any>(null);

  // Filter data
  const startDate = startOfMonth(new Date(filtros.competencia + '-01'));
  const endDate = endOfMonth(startDate);
  
  const pontosFiltrados = pontoMarcacoes.filter(p => {
    const dateMatch = p.dataISO >= format(startDate, 'yyyy-MM-dd') && p.dataISO <= format(endDate, 'yyyy-MM-dd');
    if (!dateMatch) return false;
    
    const pessoa = pessoas.find(pe => pe.id === p.pessoaId);
    if (!pessoa) return false;
    
    const lojaMatch = !filtros.loja || pessoa.lojaId === filtros.loja;
    const ccMatch = !filtros.cc || pessoa.ccId === filtros.cc;
    
    return lojaMatch && ccMatch;
  });

  const ajustesFiltrados = ajustesPonto.filter(a => {
    const dateMatch = a.dataISO >= format(startDate, 'yyyy-MM-dd') && a.dataISO <= format(endDate, 'yyyy-MM-dd');
    if (!dateMatch) return false;
    
    const pessoa = pessoas.find(pe => pe.id === a.pessoaId);
    if (!pessoa) return false;
    
    const lojaMatch = filtros.loja === 'all' || pessoa.lojaId === filtros.loja;
    const ccMatch = filtros.cc === 'all' || pessoa.ccId === filtros.cc;
    
    return lojaMatch && ccMatch;
  });

  // Build KPIs
  const kpis = buildJornadaKPIs(pontosFiltrados, ajustesFiltrados);

  // Weekly heatmap data (faltas/atrasos)
  const weeks = eachWeekOfInterval({ start: startDate, end: endDate });
  const heatmapData = weeks.map((week, index) => {
    const weekStart = startOfWeek(week);
    const weekEnd = endOfWeek(week);
    
    const faltasSemana = pontosFiltrados.filter(p => {
      const pData = new Date(p.dataISO);
      return pData >= weekStart && pData <= weekEnd && (!p.horaIn || !p.horaOut);
    }).length;
    
    const atrasosSemana = pontosFiltrados.filter(p => {
      const pData = new Date(p.dataISO);
      if (pData < weekStart || pData > weekEnd || !p.horaIn) return false;
      const [hora] = p.horaIn.split(':').map(Number);
      return hora > 8; // Considerando entrada após 8h como atraso
    }).length;

    return {
      semana: `S${index + 1}`,
      faltas: faltasSemana,
      atrasos: atrasosSemana,
      data: format(weekStart, 'dd/MM')
    };
  });

  // CC data for bar chart
  const ccs = Array.from(new Set(pessoas.map(p => p.ccId))).filter(Boolean);
  const ccData = ccs.map(ccId => {
    const pessoasCC = pessoas.filter(p => p.ccId === ccId);
    const ajustesCC = ajustesFiltrados.filter(a => pessoasCC.some(p => p.id === a.pessoaId));
    const horasExtraCC = ajustesCC.filter(a => a.horas > 0).reduce((acc, a) => acc + a.horas, 0);
    
    return {
      cc: `CC-${ccId.split('-')[1]}`,
      ajustes: ajustesCC.length,
      horasExtra: horasExtraCC
    };
  });

  const handleExport = (tipo: 'csv' | 'pdf') => {
    toast({
      title: "Export realizado",
      description: `Relatório de Jornada exportado em ${tipo.toUpperCase()} (mock)`
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Pendente</Badge>;
      case 'aprovado':
        return <Badge variant="outline" className="text-green-600 border-green-600">Aprovado</Badge>;
      case 'recusado':
        return <Badge variant="outline" className="text-red-600 border-red-600">Recusado</Badge>;
      default:
        return null;
    }
  };

  const lojas = ['loja-1', 'loja-2', 'loja-3'];
  const centrosCusto = Array.from(new Set(pessoas.map(p => p.ccId))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatório de Jornada</h1>
          <p className="text-muted-foreground">Análise de ponto e jornada de trabalho</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')} className="gap-2">
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <div>
                <Label htmlFor="competencia">Competência</Label>
                <Input
                  id="competencia"
                  type="month"
                  value={filtros.competencia}
                  onChange={(e) => setFiltros(prev => ({ ...prev, competencia: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="loja">Loja</Label>
                <Select value={filtros.loja} onValueChange={(value) => setFiltros(prev => ({ ...prev, loja: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as lojas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as lojas</SelectItem>
                    {lojas.map(loja => (
                      <SelectItem key={loja} value={loja}>Loja {loja.split('-')[1]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cc">Centro de Custo</Label>
                <Select value={filtros.cc} onValueChange={(value) => setFiltros(prev => ({ ...prev, cc: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os CCs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os CCs</SelectItem>
                    {centrosCusto.map(cc => (
                      <SelectItem key={cc} value={cc}>CC-{cc.split('-')[1]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{kpis.ajustesPendentes}</div>
            <div className="text-sm text-muted-foreground">Ajustes Pendentes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{kpis.ajustesAprovados}</div>
            <div className="text-sm text-muted-foreground">Ajustes Aprovados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{kpis.horasExtras.toFixed(1)}h</div>
            <div className="text-sm text-muted-foreground">HE Acumulada (mock)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-primary">{parseFloat(kpis.percentualPresenca).toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">% Presença</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Heatmap Semanal - Faltas e Atrasos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={heatmapData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semana" />
                <YAxis />
                <Tooltip labelFormatter={(value, payload) => {
                  const item = heatmapData.find(d => d.semana === value);
                  return `${value} (${item?.data})`;
                }} />
                <Bar dataKey="faltas" fill="#ef4444" name="Faltas" />
                <Bar dataKey="atrasos" fill="#f97316" name="Atrasos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CC Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ajustes e HE por Centro de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ccData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cc" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="ajustes" fill="#8884d8" name="Ajustes" />
                <Bar dataKey="horasExtra" fill="#82ca9d" name="Horas Extra" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Adjustments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ajustes de Ponto</CardTitle>
        </CardHeader>
        <CardContent>
          {ajustesFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum ajuste encontrado no período
            </div>
          ) : (
            <div className="space-y-4">
              {ajustesFiltrados.slice(0, 10).map(ajuste => {
                const pessoa = pessoas.find(p => p.id === ajuste.pessoaId);
                return (
                  <div key={ajuste.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {pessoa?.nome} - {format(new Date(ajuste.dataISO), 'dd/MM/yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ajuste.motivo} - {formatHours(ajuste.horas)}
                      </div>
                      {ajuste.observacao && (
                        <div className="text-xs text-muted-foreground">
                          {ajuste.observacao}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(ajuste.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAjusteDetalhes(ajuste)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {ajustesFiltrados.length > 10 && (
                <div className="text-center py-2 text-muted-foreground">
                  E mais {ajustesFiltrados.length - 10} ajustes...
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjustment Details Modal */}
      <Dialog open={!!ajusteDetalhes} onOpenChange={() => setAjusteDetalhes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Ajuste</DialogTitle>
          </DialogHeader>
          {ajusteDetalhes && (
            <div className="space-y-4">
              <div>
                <Label>Colaborador</Label>
                <div className="font-medium">
                  {pessoas.find(p => p.id === ajusteDetalhes.pessoaId)?.nome}
                </div>
              </div>
              <div>
                <Label>Data</Label>
                <div>{format(new Date(ajusteDetalhes.dataISO), 'dd/MM/yyyy')}</div>
              </div>
              <div>
                <Label>Horas</Label>
                <div className={ajusteDetalhes.horas >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatHours(ajusteDetalhes.horas)}
                </div>
              </div>
              <div>
                <Label>Motivo</Label>
                <div>{ajusteDetalhes.motivo}</div>
              </div>
              {ajusteDetalhes.observacao && (
                <div>
                  <Label>Observação</Label>
                  <div>{ajusteDetalhes.observacao}</div>
                </div>
              )}
              <div>
                <Label>Status</Label>
                <div>{getStatusBadge(ajusteDetalhes.status)}</div>
              </div>
              <div>
                <Label>Solicitado em</Label>
                <div>{format(new Date(ajusteDetalhes.criadoEm), 'dd/MM/yyyy HH:mm')}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}