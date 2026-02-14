import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useRhStore } from '../store/rhStore';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';

// Mock de férias para demonstração
interface FeriasMock {
  id: string;
  pessoaId: string;
  dataInicio: string;
  dataFim: string;
  dias: number;
  status: 'solicitado' | 'aprovado' | 'recusado' | 'agendado';
  observacao?: string;
}

export default function FeriasPage() {
  const { pessoas } = useRhStore();
  
  const [showSolicitarModal, setShowSolicitarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Form de solicitação
  const [formData, setFormData] = useState({
    pessoaId: '',
    dateRange: undefined as DateRange | undefined,
    observacao: ''
  });

  // Mock de férias para demonstração
  const feriasMock: FeriasMock[] = [
    {
      id: '1',
      pessoaId: pessoas[0]?.id || '1',
      dataInicio: '2024-12-20',
      dataFim: '2024-12-31',
      dias: 10,
      status: 'solicitado',
      observacao: 'Férias de fim de ano'
    }
  ];

  const handleSolicitarFerias = async () => {
    if (!formData.pessoaId || !formData.dateRange?.from || !formData.dateRange?.to) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Férias solicitadas',
      description: 'Solicitação de férias enviada para aprovação.'
    });

    setShowSolicitarModal(false);
    setFormData({ pessoaId: '', dateRange: undefined, observacao: '' });
  };

  const handleAprovarFerias = (id: string, aprovar: boolean) => {
    toast({
      title: aprovar ? 'Férias aprovadas' : 'Férias recusadas',
      description: `As férias foram ${aprovar ? 'aprovadas e agendadas' : 'recusadas'}.`
    });
  };

  const getStatusBadge = (status: FeriasMock['status']) => {
    switch (status) {
      case 'solicitado':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Solicitado</Badge>;
      case 'aprovado':
        return <Badge variant="default" className="gap-1 bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />Aprovado</Badge>;
      case 'recusado':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Recusado</Badge>;
      case 'agendado':
        return <Badge variant="default" className="gap-1 bg-blue-100 text-blue-800"><CalendarDays className="w-3 h-3" />Agendado</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Férias</h1>
          <p className="text-muted-foreground">Controle de solicitações e calendário de férias</p>
        </div>
        <Button onClick={() => setShowSolicitarModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Solicitar Férias
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Calendário - {format(selectedDate, 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
            
            {/* Legenda */}
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">Férias no mês:</h4>
              {feriasMock.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma féria agendada para este mês</p>
              ) : (
                <div className="space-y-1">
                  {feriasMock.map((feria) => {
                    const pessoa = pessoas.find(p => p.id === feria.pessoaId);
                    
                    return (
                      <div key={feria.id} className="flex items-center justify-between text-sm">
                        <span>{pessoa?.nome} - {feria.dias}d</span>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(feria.status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Férias */}
        <Card>
          <CardHeader>
            <CardTitle>Solicitações de Férias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feriasMock.map((feria) => {
                const pessoa = pessoas.find(p => p.id === feria.pessoaId);
                
                return (
                  <div key={feria.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{pessoa?.nome}</h4>
                        <p className="text-sm text-muted-foreground">{pessoa?.cargo}</p>
                      </div>
                      {getStatusBadge(feria.status)}
                    </div>
                    
                    <div className="text-sm">
                      <p><strong>Período:</strong> {format(new Date(feria.dataInicio), 'dd/MM/yyyy')} - {format(new Date(feria.dataFim), 'dd/MM/yyyy')}</p>
                      <p><strong>Dias:</strong> {feria.dias}</p>
                      {feria.observacao && <p><strong>Observação:</strong> {feria.observacao}</p>}
                    </div>
                    
                    {feria.status === 'solicitado' && (
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleAprovarFerias(feria.id, true)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleAprovarFerias(feria.id, false)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Recusar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {feriasMock.length === 0 && (
                <div className="text-center py-8">
                  <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma solicitação de férias ainda</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Solicitação */}
      <Dialog open={showSolicitarModal} onOpenChange={setShowSolicitarModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Solicitar Férias</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Colaborador *</Label>
              <Select
                value={formData.pessoaId}
                onValueChange={(value) => setFormData({ ...formData, pessoaId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {pessoas.filter(p => p.situacao === 'ativo').map((pessoa) => (
                    <SelectItem key={pessoa.id} value={pessoa.id}>
                      {pessoa.nome} - {pessoa.cargo} (Saldo: {pessoa.saldoFeriasDias || 30}d)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Período das Férias *</Label>
              <Calendar
                mode="range"
                selected={formData.dateRange}
                onSelect={(range) => setFormData({ ...formData, dateRange: range })}
                className="rounded-md border"
                numberOfMonths={2}
              />
            </div>
            
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações adicionais..."
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSolicitarModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSolicitarFerias}>
              Solicitar Férias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}