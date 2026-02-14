import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Calendar, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRhStore } from '../../store/rhStore';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { formatHours } from '../../utils/seedRhMissing8';

export default function PortalHoras() {
  const { toast } = useToast();
  const { pontoMarcacoes, ajustesPonto, bancoHorasMovs } = useRhStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [competencia, setCompetencia] = useState(format(new Date(), 'yyyy-MM'));
  const [ajusteForm, setAjusteForm] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    horas: '',
    motivo: '',
    observacao: ''
  });
  
  // Mock current employee
  const currentEmployeeId = 'pessoa-1';
  
  // Filter data for current employee and competence
  const startDate = startOfMonth(new Date(competencia + '-01'));
  const endDate = endOfMonth(startDate);
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
  
  const pontosMes = pontoMarcacoes.filter(p => 
    p.pessoaId === currentEmployeeId &&
    p.dataISO >= format(startDate, 'yyyy-MM-dd') &&
    p.dataISO <= format(endDate, 'yyyy-MM-dd')
  );
  
  const ajustesMes = ajustesPonto.filter(a => 
    a.pessoaId === currentEmployeeId &&
    a.dataISO >= format(startDate, 'yyyy-MM-dd') &&
    a.dataISO <= format(endDate, 'yyyy-MM-dd')
  );
  
  // Calculate saldo banco de horas
  const saldoBancoHoras = bancoHorasMovs
    .filter(m => m.pessoaId === currentEmployeeId)
    .reduce((acc, mov) => acc + (mov.tipo === 'CREDITO' ? mov.horas : -mov.horas), 0);
  
  // Summary calculations
  const horasPrevistas = daysInMonth.filter(day => {
    const dayOfWeek = day.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Segunda a sexta
  }).length * 8; // 8h por dia útil
  
  const horasRegistradas = pontosMes.reduce((acc, ponto) => {
    if (ponto.horaIn && ponto.horaOut) {
      const [inH, inM] = ponto.horaIn.split(':').map(Number);
      const [outH, outM] = ponto.horaOut.split(':').map(Number);
      const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - 60; // -60min almoço
      return acc + Math.max(0, totalMinutes / 60);
    }
    return acc;
  }, 0);
  
  const saldo = horasRegistradas - horasPrevistas;

  const handleSolicitarAjuste = () => {
    if (!ajusteForm.horas || !ajusteForm.motivo) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    
    // Mock: create adjustment request
    const novoAjuste = {
      id: `ajuste-${Date.now()}`,
      pessoaId: currentEmployeeId,
      dataISO: ajusteForm.data,
      motivo: ajusteForm.motivo,
      horas: parseFloat(ajusteForm.horas),
      observacao: ajusteForm.observacao,
      status: 'pendente' as const,
      criadoPor: currentEmployeeId,
      criadoEm: new Date().toISOString()
    };
    
    // In real app would call store action
    console.log('Novo ajuste:', novoAjuste);
    
    toast({
      title: "Ajuste solicitado",
      description: "Sua solicitação foi enviada para aprovação"
    });
    
    // Reset form
    setAjusteForm({
      data: format(new Date(), 'yyyy-MM-dd'),
      horas: '',
      motivo: '',
      observacao: ''
    });
    setModalOpen(false);
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

  const getDayStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const ponto = pontosMes.find(p => p.dataISO === dateStr);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    if (isWeekend) return { icon: null, color: 'text-muted-foreground' };
    if (!ponto) return { icon: AlertCircle, color: 'text-red-500' };
    if (ponto.horaIn && ponto.horaOut) return { icon: CheckCircle2, color: 'text-green-500' };
    return { icon: AlertCircle, color: 'text-orange-500' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minhas Horas</h1>
          <p className="text-muted-foreground">Controle de ponto e banco de horas</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Solicitar Ajuste
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Ajuste de Ponto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={ajusteForm.data}
                  onChange={(e) => setAjusteForm(prev => ({ ...prev, data: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="horas">Horas (positivo = crédito, negativo = débito) *</Label>
                <Input
                  id="horas"
                  type="number"
                  step="0.5"
                  placeholder="Ex: 2.5 ou -1.0"
                  value={ajusteForm.horas}
                  onChange={(e) => setAjusteForm(prev => ({ ...prev, horas: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="motivo">Motivo *</Label>
                <Input
                  id="motivo"
                  placeholder="Ex: Esqueci de bater o ponto"
                  value={ajusteForm.motivo}
                  onChange={(e) => setAjusteForm(prev => ({ ...prev, motivo: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  placeholder="Detalhes adicionais (opcional)"
                  value={ajusteForm.observacao}
                  onChange={(e) => setAjusteForm(prev => ({ ...prev, observacao: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSolicitarAjuste}>
                  Solicitar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Competência Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="comp">Competência:</Label>
            <Input
              id="comp"
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{horasPrevistas}h</div>
            <div className="text-sm text-muted-foreground">Previstas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{horasRegistradas.toFixed(1)}h</div>
            <div className="text-sm text-muted-foreground">Registradas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatHours(saldo)}
            </div>
            <div className="text-sm text-muted-foreground">Saldo Mensal</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className={`text-2xl font-bold ${saldoBancoHoras >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatHours(saldoBancoHoras)}
            </div>
            <div className="text-sm text-muted-foreground">Banco de Horas</div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Espelho de Ponto - {format(startDate, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {daysInMonth.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const ponto = pontosMes.find(p => p.dataISO === dateStr);
              const status = getDayStatus(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              
              return (
                <Card key={dateStr} className={`p-2 ${isWeekend ? 'bg-muted/50' : ''}`}>
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-sm font-medium">{format(date, 'd')}</span>
                      {status.icon && <status.icon className={`h-3 w-3 ${status.color}`} />}
                    </div>
                    {ponto && (
                      <div className="text-xs space-y-1">
                        {ponto.horaIn && <div>E: {ponto.horaIn}</div>}
                        {ponto.horaOut && <div>S: {ponto.horaOut}</div>}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Adjustments List */}
      <Card>
        <CardHeader>
          <CardTitle>Ajustes de Ponto</CardTitle>
        </CardHeader>
        <CardContent>
          {ajustesMes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum ajuste solicitado neste período
            </div>
          ) : (
            <div className="space-y-4">
              {ajustesMes.map(ajuste => (
                <div key={ajuste.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {format(parseISO(ajuste.dataISO), 'dd/MM/yyyy')} - {formatHours(ajuste.horas)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {ajuste.motivo}
                    </div>
                    {ajuste.observacao && (
                      <div className="text-xs text-muted-foreground">
                        {ajuste.observacao}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    {getStatusBadge(ajuste.status)}
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(ajuste.criadoEm), 'dd/MM HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}