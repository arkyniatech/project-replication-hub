import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Plus } from 'lucide-react';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';

export default function FeriasPage() {
  const { pessoas } = useSupabasePessoas();
  const pessoasAtivas = pessoas.filter(p => p.situacao === 'ativo');
  
  const [showSolicitarModal, setShowSolicitarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    pessoaId: '',
    dateRange: undefined as DateRange | undefined,
    observacao: ''
  });

  const handleSolicitarFerias = async () => {
    if (!formData.pessoaId || !formData.dateRange?.from || !formData.dateRange?.to) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Férias solicitadas', description: 'Solicitação de férias enviada para aprovação.' });
    setShowSolicitarModal(false);
    setFormData({ pessoaId: '', dateRange: undefined, observacao: '' });
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
            <div className="mt-4">
              <h4 className="font-medium">Férias no mês:</h4>
              <p className="text-sm text-muted-foreground mt-1">Nenhuma férias agendada</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Solicitações de Férias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma solicitação de férias registrada</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSolicitarModal} onOpenChange={setShowSolicitarModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Solicitar Férias</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Colaborador *</Label>
              <Select value={formData.pessoaId} onValueChange={(value) => setFormData({ ...formData, pessoaId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {pessoasAtivas.map((pessoa) => (
                    <SelectItem key={pessoa.id} value={pessoa.id}>
                      {pessoa.nome} - {pessoa.cargo}
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
            <Button variant="outline" onClick={() => setShowSolicitarModal(false)}>Cancelar</Button>
            <Button onClick={handleSolicitarFerias}>Solicitar Férias</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
