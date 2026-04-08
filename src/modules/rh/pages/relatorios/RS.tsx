import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Clock, Download, Filter } from 'lucide-react';
import { useRhStore } from '../../store/rhStore';
import { useRhModule } from '../../providers/RhModuleProvider';
import { buildRsFunnel } from '../../utils/helpers';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function RelatorioRS() {
  const { toast } = useToast();
  const { vagas, candidatos, pessoas } = useRhStore();
  const { scope } = useRhModule();
  const [filtros, setFiltros] = useState({
    periodo: format(new Date(), 'yyyy-MM'),
    loja: 'all',
    cargo: 'all'
  });

  // Filter data based on filters
  const vagasFiltradas = vagas.filter(vaga => {
    const dataMatch = !filtros.periodo || vaga.criadoEm.startsWith(filtros.periodo);
    const lojaMatch = filtros.loja === 'all' || vaga.lojaId === filtros.loja;
    const cargoMatch = filtros.cargo === 'all' || vaga.cargo === filtros.cargo;
    return dataMatch && lojaMatch && cargoMatch;
  });

  const candidatosFiltrados = candidatos.filter(candidato => {
    const vaga = vagas.find(v => v.id === candidato.vagaId);
    return vaga && vagasFiltradas.some(vf => vf.id === vaga.id);
  });

  // Build funnel data
  const funnelData = Object.entries(buildRsFunnel(vagasFiltradas, candidatosFiltrados))
    .filter(([key]) => key !== 'taxaConversao')
    .map(([etapa, count]) => ({
      etapa: etapa.charAt(0).toUpperCase() + etapa.slice(1),
      count: count as number
    }));

  // Lead time calculation
  const leadTimeData = vagasFiltradas.map(vaga => {
    const diasAberta = differenceInDays(new Date(), parseISO(vaga.criadoEm));
    const candidatosVaga = candidatosFiltrados.filter(c => c.vagaId === vaga.id);
    const admitidos = candidatosVaga.filter(c => c.etapa === 'aprovado').length;
    
    return {
      vaga: vaga.titulo,
      dias: diasAberta,
      candidatos: candidatosVaga.length,
      admitidos,
      status: vaga.status
    };
  }).sort((a, b) => b.dias - a.dias).slice(0, 5);

  // Sources data (mock distribution)
  const fontesData = [
    { fonte: 'Site', candidatos: Math.floor(candidatosFiltrados.length * 0.4), cor: '#8884d8' },
    { fonte: 'Indicação', candidatos: Math.floor(candidatosFiltrados.length * 0.35), cor: '#82ca9d' },
    { fonte: 'Redes Sociais', candidatos: Math.floor(candidatosFiltrados.length * 0.25), cor: '#ffc658' }
  ];

  // Stages data
  const etapasData = [
    { etapa: 'Triagem', count: candidatosFiltrados.filter(c => c.etapa === 'triagem').length },
    { etapa: 'Entrevista', count: candidatosFiltrados.filter(c => c.etapa === 'entrevista').length },
    { etapa: 'Teste', count: candidatosFiltrados.filter(c => c.etapa === 'teste').length },
    { etapa: 'Aprovado', count: candidatosFiltrados.filter(c => c.etapa === 'aprovado').length },
    { etapa: 'Reprovado', count: candidatosFiltrados.filter(c => c.etapa === 'reprovado').length }
  ];

  const handleExport = (tipo: 'csv' | 'pdf') => {
    toast({
      title: "Export realizado",
      description: `Relatório R&S exportado em ${tipo.toUpperCase()}`
    });
  };

  const lojas = ['loja-1', 'loja-2', 'loja-3'];
  const cargos = Array.from(new Set(vagas.map(v => v.cargo)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatório R&S</h1>
          <p className="text-muted-foreground">Análise de recrutamento e seleção</p>
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
                <Label htmlFor="periodo">Período</Label>
                <Input
                  id="periodo"
                  type="month"
                  value={filtros.periodo}
                  onChange={(e) => setFiltros(prev => ({ ...prev, periodo: e.target.value }))}
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
                <Label htmlFor="cargo">Cargo</Label>
                <Select value={filtros.cargo} onValueChange={(value) => setFiltros(prev => ({ ...prev, cargo: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os cargos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os cargos</SelectItem>
                    {cargos.map(cargo => (
                      <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
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
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{vagasFiltradas.length}</div>
            <div className="text-sm text-muted-foreground">Vagas Abertas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{candidatosFiltrados.length}</div>
            <div className="text-sm text-muted-foreground">Candidatos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {leadTimeData.length > 0 ? Math.round(leadTimeData.reduce((acc, item) => acc + item.dias, 0) / leadTimeData.length) : 0}
            </div>
            <div className="text-sm text-muted-foreground">Lead Time Médio (dias)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-primary">
              {candidatosFiltrados.filter(c => c.etapa === 'aprovado').length}
            </div>
            <div className="text-sm text-muted-foreground">Admissões</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Funil de Seleção</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="etapa" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sources Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Fontes de Candidatos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fontesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ fonte, percent }) => `${fonte} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="candidatos"
                >
                  {fontesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Lead Time Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Vagas - Lead Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leadTimeData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{item.vaga}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.candidatos} candidatos • {item.admitidos} admitidos
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{item.dias} dias</div>
                    <Badge variant={item.status === 'aberta' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {leadTimeData.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhuma vaga encontrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stages Table */}
        <Card>
          <CardHeader>
            <CardTitle>Candidatos por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {etapasData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="font-medium">{item.etapa}</div>
                  <div className="text-right">
                    <div className="font-bold">{item.count}</div>
                    <div className="text-sm text-muted-foreground">
                      {candidatosFiltrados.length > 0 
                        ? `${((item.count / candidatosFiltrados.length) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}