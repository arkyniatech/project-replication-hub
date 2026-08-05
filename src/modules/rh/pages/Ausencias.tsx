import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Plus, AlertTriangle } from 'lucide-react';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { useSupabaseAusencias } from '../hooks/useSupabaseAusencias';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const TIPOS = [
  { value: 'falta_injustificada', label: 'Falta injustificada' },
  { value: 'falta_justificada', label: 'Falta justificada' },
  { value: 'atestado', label: 'Atestado médico' },
  { value: 'licenca_maternidade', label: 'Licença-maternidade' },
  { value: 'licenca_paternidade', label: 'Licença-paternidade' },
  { value: 'acidente_trabalho', label: 'Acidente de trabalho' },
  { value: 'afastamento_inss', label: 'Afastamento (INSS)' },
  { value: 'suspensao', label: 'Suspensão' },
  { value: 'outro', label: 'Outro' },
];
const tipoLabel = (v: string) => TIPOS.find((t) => t.value === v)?.label ?? v;
const fmt = (d?: string | null) => (d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '—');

const EMPTY = { pessoaId: '', tipo: '', dataInicio: '', dataFim: '', justificativa: '' };

export default function Ausencias() {
  const { pessoas } = useSupabasePessoas();
  const pessoasAtivas = pessoas.filter((p) => p.situacao === 'ativo');
  const { ausencias, isLoading, registrar } = useSupabaseAusencias();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const handleRegistrar = async () => {
    const pessoa = pessoasAtivas.find((p) => p.id === form.pessoaId);
    if (!pessoa || !form.tipo || !form.dataInicio || !form.dataFim) {
      toast.error('Preencha colaborador, tipo e as datas.');
      return;
    }
    if (!pessoa.lojaId) {
      toast.error('Este colaborador não tem loja definida.');
      return;
    }
    if (form.dataFim < form.dataInicio) {
      toast.error('A data fim não pode ser antes da data início.');
      return;
    }
    try {
      await registrar.mutateAsync({
        pessoa_id: pessoa.id,
        loja_id: pessoa.lojaId,
        tipo: form.tipo,
        data_inicio: form.dataInicio,
        data_fim: form.dataFim,
        justificativa: form.justificativa || undefined,
      });
      toast.success(
        form.tipo === 'falta_injustificada'
          ? 'Ausência registrada — pode reduzir o direito de férias.'
          : 'Ausência registrada.',
      );
      setIsModalOpen(false);
      setForm(EMPTY);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao registrar.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Ausências</h1>
          <p className="text-muted-foreground">Atestados, faltas e licenças</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Registrar Ausência</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Ausência</DialogTitle></DialogHeader>
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
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.tipo === 'falta_injustificada' && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Reduz o direito de férias (faixa da CLT).
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data início *</Label>
                  <Input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Data fim *</Label>
                  <Input type="date" value={form.dataFim} onChange={(e) => setForm({ ...form, dataFim: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Justificativa</Label>
                <Textarea placeholder="Observações..." value={form.justificativa} onChange={(e) => setForm({ ...form, justificativa: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleRegistrar} disabled={registrar.isPending}>
                  {registrar.isPending ? 'Registrando...' : 'Registrar'}
                </Button>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Ausências registradas</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : ausencias.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma ausência registrada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ausencias.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.pessoa?.nome ?? '—'}</p>
                    <p className="text-sm text-muted-foreground">
                      {fmt(a.data_inicio)} – {fmt(a.data_fim)} · {a.dias} dia(s)
                    </p>
                  </div>
                  <Badge variant={a.tipo === 'falta_injustificada' ? 'destructive' : 'secondary'}>
                    {tipoLabel(a.tipo)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
