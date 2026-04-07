import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Clock, Plus, Download } from 'lucide-react';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';

export default function Ponto() {
  const { pessoas } = useSupabasePessoas();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAjusteModal, setShowAjusteModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Ponto</h1>
          <p className="text-muted-foreground">Controle de ponto e jornada</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />Exportar
          </Button>
          <Button size="sm" onClick={() => setShowAjusteModal(true)}>
            <Plus className="h-4 w-4 mr-2" />Ajuste de Ponto
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Colaborador</label>
              <Select defaultValue="all">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {pessoas.filter(p => p.situacao === 'ativo').map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mês/Ano</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Marcações de Ponto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma marcação registrada</h3>
                <p className="text-muted-foreground">As marcações de ponto aparecerão aqui</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showAjusteModal && (
        <Dialog open={showAjusteModal} onOpenChange={setShowAjusteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Ajuste de Ponto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Horas (+/-)</label>
                <Input type="number" step="0.25" placeholder="Ex: 1.5 ou -0.5" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo</label>
                <Textarea placeholder="Descreva o motivo do ajuste..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAjusteModal(false)}>Cancelar</Button>
                <Button>Solicitar Ajuste</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
