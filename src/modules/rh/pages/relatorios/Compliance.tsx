import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, AlertCircle, CheckCircle2, Calendar, Download, Filter, Plus } from 'lucide-react';
import { useRhStore } from '../../store/rhStore';
import { buildComplianceStats } from '../../utils/helpers';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function RelatorioCompliance() {
  const { toast } = useToast();
  const { participacoesTreinamento, treinamentos, pessoas, examesASO } = useRhStore();
  const [filtros, setFiltros] = useState({
    periodo: format(new Date(), 'yyyy-MM'),
    loja: 'all',
    cc: 'all'
  });
  const [agendarModal, setAgendarModal] = useState(false);
  const [agendamento, setAgendamento] = useState({
    pessoaId: '',
    tipo: 'ASO',
    data: '',
    observacao: ''
  });

  // Filter data
  const pessoasFiltradas = pessoas.filter(p => {
    const lojaMatch = filtros.loja === 'all' || p.lojaId === filtros.loja;
    const ccMatch = filtros.cc === 'all' || p.ccId === filtros.cc;
    return lojaMatch && ccMatch;
  });

  const participacoesFiltradas = participacoesTreinamento.filter(pt => {
    return pessoasFiltradas.some(p => p.id === pt.pessoaId);
  });

  const examesFiltrados = examesASO.filter(aso => {
    return pessoasFiltradas.some(p => p.id === aso.pessoaId);
  });

  // Build compliance stats
  const complianceStats = buildComplianceStats(examesFiltrados, participacoesFiltradas, treinamentos);

  // Unit/CC ranking data
  const lojas = Array.from(new Set(pessoasFiltradas.map(p => p.lojaId)));
  const ccs = Array.from(new Set(pessoasFiltradas.map(p => p.ccId))).filter(Boolean);
  
  const rankingData = [
    ...lojas.map(lojaId => {
      const pessoasLoja = pessoasFiltradas.filter(p => p.lojaId === lojaId);
      const total = pessoasLoja.length;
      const conformes = pessoasLoja.filter(p => {
        const asoOk = examesFiltrados.some(aso => aso.pessoaId === p.id && differenceInDays(parseISO(aso.dataVencimento), new Date()) > 0);
        const nrOk = participacoesFiltradas.some(pt => pt.pessoaId === p.id && differenceInDays(parseISO(pt.vencimentoISO), new Date()) > 0);
        return asoOk && nrOk;
      }).length;
      
      return {
        nome: `Loja ${lojaId.split('-')[1]}`,
        tipo: 'Loja',
        conformidade: total > 0 ? Math.round((conformes / total) * 100) : 0,
        total,
        conformes
      };
    }),
    ...ccs.map(ccId => {
      const pessoasCC = pessoasFiltradas.filter(p => p.ccId === ccId);
      const total = pessoasCC.length;
      const conformes = pessoasCC.filter(p => {
        const asoOk = examesFiltrados.some(aso => aso.pessoaId === p.id && differenceInDays(parseISO(aso.dataVencimento), new Date()) > 0);
        const nrOk = participacoesFiltradas.some(pt => pt.pessoaId === p.id && differenceInDays(parseISO(pt.vencimentoISO), new Date()) > 0);
        return asoOk && nrOk;
      }).length;
      
      return {
        nome: `CC-${ccId.split('-')[1]}`,
        tipo: 'CC',
        conformidade: total > 0 ? Math.round((conformes / total) * 100) : 0,
        total,
        conformes
      };
    })
  ].sort((a, b) => b.conformidade - a.conformidade);

  // Pending items
  const pendencias = [
    ...examesFiltrados
      .filter(aso => differenceInDays(new Date(), parseISO(aso.dataVencimento)) > -30 && differenceInDays(new Date(), parseISO(aso.dataVencimento)) <= 0)
      .map(aso => ({
        tipo: 'ASO',
        pessoa: pessoas.find(p => p.id === aso.pessoaId)?.nome,
        descricao: `ASO ${aso.tipo}`,
        vencimento: aso.dataVencimento,
        status: differenceInDays(parseISO(aso.dataVencimento), new Date()) < 0 ? 'vencido' : 'vencendo'
      })),
    ...participacoesFiltradas
      .filter(pt => differenceInDays(new Date(), parseISO(pt.vencimentoISO)) > -30 && differenceInDays(new Date(), parseISO(pt.vencimentoISO)) <= 0)
      .map(pt => {
        const treinamento = treinamentos.find(t => t.id === pt.treinamentoId);
        return {
          tipo: 'NR',
          pessoa: pessoas.find(p => p.id === pt.pessoaId)?.nome,
          descricao: treinamento?.nome || 'Treinamento',
          vencimento: pt.vencimentoISO,
          status: differenceInDays(parseISO(pt.vencimentoISO), new Date()) < 0 ? 'vencido' : 'vencendo'
        };
      })
  ].sort((a, b) => parseISO(a.vencimento).getTime() - parseISO(b.vencimento).getTime());

  const handleAgendar = () => {
    if (!agendamento.pessoaId || !agendamento.data) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Mock scheduling
    console.log('Agendamento:', agendamento);
    
    toast({
      title: "Agendado com sucesso",
      description: `${agendamento.tipo} agendado para ${format(new Date(agendamento.data), 'dd/MM/yyyy')}`
    });

    setAgendamento({
      pessoaId: '',
      tipo: 'ASO',
      data: '',
      observacao: ''
    });
    setAgendarModal(false);
  };

  const handleExport = (tipo: 'csv' | 'pdf') => {
    toast({
      title: "Export realizado",
      description: `Relatório de Compliance exportado em ${tipo.toUpperCase()}`
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vencido':
        return <Badge variant="destructive">Vencido</Badge>;
      case 'vencendo':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Vencendo</Badge>;
      case 'ok':
        return <Badge variant="outline" className="text-green-600 border-green-600">OK</Badge>;
      default:
        return null;
    }
  };

  const lojasList = ['loja-1', 'loja-2', 'loja-3'];
  const centrosCusto = Array.from(new Set(pessoas.map(p => p.ccId))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatório de Compliance</h1>
          <p className="text-muted-foreground">Controle de ASO e treinamentos obrigatórios</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={agendarModal} onOpenChange={setAgendarModal}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Agendar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agendar ASO/Treinamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pessoa">Colaborador *</Label>
                  <Select value={agendamento.pessoaId} onValueChange={(value) => setAgendamento(prev => ({ ...prev, pessoaId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {pessoasFiltradas.map(pessoa => (
                        <SelectItem key={pessoa.id} value={pessoa.id}>{pessoa.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select value={agendamento.tipo} onValueChange={(value) => setAgendamento(prev => ({ ...prev, tipo: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASO">ASO</SelectItem>
                      <SelectItem value="NR-11">NR-11</SelectItem>
                      <SelectItem value="NR-12">NR-12</SelectItem>
                      <SelectItem value="NR-18">NR-18</SelectItem>
                      <SelectItem value="NR-35">NR-35</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="data">Data *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={agendamento.data}
                    onChange={(e) => setAgendamento(prev => ({ ...prev, data: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="obs">Observação</Label>
                  <Textarea
                    id="obs"
                    placeholder="Observações do agendamento"
                    value={agendamento.observacao}
                    onChange={(e) => setAgendamento(prev => ({ ...prev, observacao: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAgendarModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAgendar}>
                    Agendar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                    {lojasList.map(loja => (
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

      {/* KPI Cards */}
      <div className="grid md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{complianceStats.aso.vencidos}</div>
            <div className="text-sm text-muted-foreground">ASO Vencidos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{complianceStats.aso.vencendo}</div>
            <div className="text-sm text-muted-foreground">ASO Vencendo</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{complianceStats.aso.ok}</div>
            <div className="text-sm text-muted-foreground">ASO OK</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{complianceStats.treinamentos.vencidos}</div>
            <div className="text-sm text-muted-foreground">NR Vencidos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{complianceStats.treinamentos.vencendo}</div>
            <div className="text-sm text-muted-foreground">NR Vencendo</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{complianceStats.treinamentos.ok}</div>
            <div className="text-sm text-muted-foreground">NR OK</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Ranking Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking de Conformidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankingData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Conformidade']} />
                <Bar dataKey="conformidade" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pendências Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pendências Próximas</CardTitle>
          </CardHeader>
          <CardContent>
            {pendencias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma pendência encontrada</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {pendencias.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{item.pessoa}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.descricao}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Vencimento: {format(parseISO(item.vencimento), 'dd/MM/yyyy')}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(item.status)}
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.tipo}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}