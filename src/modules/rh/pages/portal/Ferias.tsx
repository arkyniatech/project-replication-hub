import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Plane, Clock } from 'lucide-react';
import { useRhStore } from '../../store/rhStore';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function PortalFerias() {
  const { toast } = useToast();
  const { ferias, pessoas } = useRhStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [feriasForm, setFeriasForm] = useState({
    dataInicio: '',
    dataFim: '',
    observacao: ''
  });
  
  // Mock current employee
  const currentEmployeeId = 'pessoa-1';
  const currentEmployee = pessoas.find(p => p.id === currentEmployeeId);
  
  // Filter ferias for current employee
  const minhasFerias = ferias.filter(f => f.colaboradorId === currentEmployeeId);
  
  const handleSolicitarFerias = () => {
    if (!feriasForm.dataInicio || !feriasForm.dataFim) {
      toast({
        title: "Erro",
        description: "Preencha as datas de início e fim",
        variant: "destructive"
      });
      return;
    }
    
    const diasSolicitados = differenceInDays(
      new Date(feriasForm.dataFim), 
      new Date(feriasForm.dataInicio)
    ) + 1;
    
    if (diasSolicitados > (currentEmployee?.saldoFeriasDias || 0)) {
      toast({
        title: "Erro",
        description: "Dias solicitados excedem o saldo disponível",
        variant: "destructive"
      });
      return;
    }
    
    // Mock: create vacation request  
    const novasFerias = {
      id: `ferias-${Date.now()}`,
      pessoaId: currentEmployeeId,
      dataInicioISO: feriasForm.dataInicio,
      dataFimISO: feriasForm.dataFim,
      dias: diasSolicitados,
      status: 'solicitado' as const,
      observacao: feriasForm.observacao,
      criadoEm: new Date().toISOString(),
      criadoPor: currentEmployeeId
    };
    
    // In real app would call store action
    console.log('Novas férias:', novasFerias);
    
    toast({
      title: "Férias solicitadas",
      description: `Solicitação de ${diasSolicitados} dias enviada para aprovação`
    });
    
    // Reset form
    setFeriasForm({
      dataInicio: '',
      dataFim: '',
      observacao: ''
    });
    setModalOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'solicitado':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Solicitado</Badge>;
      case 'aprovado':
        return <Badge variant="outline" className="text-green-600 border-green-600">Aprovado</Badge>;
      case 'recusado':
        return <Badge variant="outline" className="text-red-600 border-red-600">Recusado</Badge>;
      case 'agendado':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Agendado</Badge>;
      case 'gozado':
        return <Badge variant="outline" className="text-muted-foreground border-muted-foreground">Concluído</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'solicitado':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'aprovado':
      case 'agendado':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'gozado':
        return <Plane className="h-4 w-4 text-green-500" />;
      default:
        return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const saldoDisponivel = currentEmployee?.saldoFeriasDias || 0;
    const diasSolicitados = minhasFerias
    .filter(f => f.status === 'planejada' || f.status === 'aprovada')
    .reduce((acc, f) => {
      const dias = Math.ceil((new Date(f.dataFim).getTime() - new Date(f.dataInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return acc + dias;
    }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minhas Férias</h1>
          <p className="text-muted-foreground">Planejamento e solicitação de férias</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={saldoDisponivel <= 0}>
              <Plus className="h-4 w-4" />
              Solicitar Férias
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Férias</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dataInicio">Data de Início *</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={feriasForm.dataInicio}
                  onChange={(e) => setFeriasForm(prev => ({ ...prev, dataInicio: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="dataFim">Data de Fim *</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={feriasForm.dataFim}
                  onChange={(e) => setFeriasForm(prev => ({ ...prev, dataFim: e.target.value }))}
                />
              </div>
              {feriasForm.dataInicio && feriasForm.dataFim && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium">
                    Dias solicitados: {differenceInDays(new Date(feriasForm.dataFim), new Date(feriasForm.dataInicio)) + 1}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Saldo disponível: {saldoDisponivel} dias
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  placeholder="Observações adicionais (opcional)"
                  value={feriasForm.observacao}
                  onChange={(e) => setFeriasForm(prev => ({ ...prev, observacao: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSolicitarFerias}>
                  Solicitar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Saldo Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{saldoDisponivel}</div>
              <div className="text-sm text-muted-foreground">Dias Disponíveis</div>
            </div>
            <div className="text-center">
              <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{diasSolicitados}</div>
              <div className="text-sm text-muted-foreground">Dias Solicitados</div>
            </div>
            <div className="text-center">
              <Plane className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{saldoDisponivel - diasSolicitados}</div>
              <div className="text-sm text-muted-foreground">Saldo Restante</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Ferias */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Férias</CardTitle>
        </CardHeader>
        <CardContent>
          {minhasFerias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma solicitação de férias encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {minhasFerias
                .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime())
                .map(ferias => {
                  const dias = Math.ceil((new Date(ferias.dataFim).getTime() - new Date(ferias.dataInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  return (
                <Card key={ferias.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(ferias.status)}
                      <div className="space-y-1">
                        <div className="font-medium">
                          {format(new Date(ferias.dataInicio), 'dd/MM/yyyy')} a{' '}
                          {format(new Date(ferias.dataFim), 'dd/MM/yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {dias} dias - {format(new Date(ferias.dataInicio), 'EEEE', { locale: ptBR })} a{' '}
                          {format(new Date(ferias.dataFim), 'EEEE', { locale: ptBR })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Período: {ferias.periodo}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      {getStatusBadge(ferias.status)}
                    </div>
                  </div>
                </Card>
              )})}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">Informações Importantes</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• As férias devem ser solicitadas com antecedência mínima de 30 dias</p>
            <p>• O período de férias não pode ser inferior a 10 dias corridos</p>
            <p>• Férias podem ser fracionadas em até 3 períodos</p>
            <p>• Em caso de urgência, entre em contato com o RH</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}