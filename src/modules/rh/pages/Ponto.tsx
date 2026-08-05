import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Plus } from 'lucide-react';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { useSupabasePonto } from '../hooks/useSupabasePonto';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

const fmt = (d?: string | null) => (d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '—');
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const EMPTY = { pessoaId: '', data: '', entrada: '', saida: '', intervalo: '0', justificativa: '' };

export default function Ponto() {
  const { pessoas } = useSupabasePessoas();
  const pessoasAtivas = pessoas.filter((p) => p.situacao === 'ativo');
  const { lancamentos, isLoading, lancar } = useSupabasePonto();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const handleLancar = async () => {
    const pessoa = pessoasAtivas.find((p) => p.id === form.pessoaId);
    if (!pessoa || !form.data) {
      toast({ title: 'Erro', description: 'Selecione o colaborador e a data.', variant: 'destructive' });
      return;
    }
    if (!pessoa.lojaId) {
      toast({ title: 'Erro', description: 'Colaborador sem loja definida.', variant: 'destructive' });
      return;
    }
    const intervalo = parseInt(form.intervalo || '0', 10) || 0;
    let horas: number | undefined;
    if (form.entrada && form.saida) {
      horas = Math.max(0, (toMin(form.saida) - toMin(form.entrada) - intervalo) / 60);
    }
    try {
      await lancar.mutateAsync({
        pessoa_id: pessoa.id,
        loja_id: pessoa.lojaId,
        data: form.data,
        entrada: form.entrada || undefined,
        saida: form.saida || undefined,
        intervalo_min: intervalo,
        horas_trabalhadas: horas,
        justificativa: form.justificativa || undefined,
      });
      toast({ title: 'Ponto lançado', description: `${pessoa.nome} · ${fmt(form.data)}` });
      setShowModal(false);
      setForm(EMPTY);
    } catch (e: any) {
      toast({ title: 'Erro ao lançar', description: e?.message ?? 'Tente novamente.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Ponto</h1>
          <p className="text-muted-foreground">Lançamento manual de jornada</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />Lançar Ponto
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Marcações</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : lancamentos.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma marcação registrada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lancamentos.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{l.pessoa?.nome ?? '—'}</p>
                    <p className="text-sm text-muted-foreground">
                      {fmt(l.data)} · {l.entrada?.slice(0, 5) ?? '--:--'} – {l.saida?.slice(0, 5) ?? '--:--'}
                      {l.intervalo_min ? ` · ${l.intervalo_min}min interv.` : ''}
                    </p>
                  </div>
                  {l.horas_trabalhadas != null && (
                    <span className="text-sm font-medium">{l.horas_trabalhadas.toFixed(2)}h</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lançar Ponto (manual)</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={form.pessoaId} onValueChange={(v) => setForm({ ...form, pessoaId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {pessoasAtivas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Entrada</Label>
                <Input type="time" value={form.entrada} onChange={(e) => setForm({ ...form, entrada: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Saída</Label>
                <Input type="time" value={form.saida} onChange={(e) => setForm({ ...form, saida: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Intervalo (min)</Label>
                <Input type="number" min="0" value={form.intervalo} onChange={(e) => setForm({ ...form, intervalo: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Justificativa</Label>
              <Textarea placeholder="Motivo do lançamento manual..." value={form.justificativa} onChange={(e) => setForm({ ...form, justificativa: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleLancar} disabled={lancar.isPending}>
                {lancar.isPending ? 'Lançando...' : 'Lançar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
