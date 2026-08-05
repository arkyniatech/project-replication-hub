import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Plus, AlertTriangle, Clock } from 'lucide-react';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { useSupabaseFeriasPeriodos } from '../hooks/useSupabaseFeriasPeriodos';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  em_aquisicao: { label: 'Em aquisição', variant: 'secondary' },
  adquirido: { label: 'A gozar', variant: 'default' },
  programado: { label: 'Programado', variant: 'outline' },
  parcialmente_gozado: { label: 'Parcial', variant: 'outline' },
  gozado: { label: 'Gozado', variant: 'secondary' },
  pago: { label: 'Pago', variant: 'secondary' },
  vencido: { label: 'Vencido', variant: 'destructive' },
  dobro_devido: { label: 'Dobro devido', variant: 'destructive' },
};

const fmt = (d?: string | null) => (d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '—');

export default function FeriasPage() {
  const { pessoas } = useSupabasePessoas();
  const pessoasAtivas = pessoas.filter((p) => p.situacao === 'ativo');
  const { periodos, vencidos, aVencer, isLoading, solicitarFerias, periodoAConsumir } = useSupabaseFeriasPeriodos();

  const [showSolicitarModal, setShowSolicitarModal] = useState(false);
  const [formData, setFormData] = useState({
    pessoaId: '',
    dateRange: undefined as DateRange | undefined,
    observacao: '',
  });

  const handleSolicitarFerias = async () => {
    if (!formData.pessoaId || !formData.dateRange?.from || !formData.dateRange?.to) {
      toast({ title: 'Erro', description: 'Selecione o colaborador e o período.', variant: 'destructive' });
      return;
    }
    const periodo = periodoAConsumir(formData.pessoaId);
    if (!periodo) {
      toast({
        title: 'Sem período disponível',
        description: 'Este colaborador não tem período aquisitivo a gozar.',
        variant: 'destructive',
      });
      return;
    }
    const dias = differenceInCalendarDays(formData.dateRange.to, formData.dateRange.from) + 1;
    try {
      await solicitarFerias.mutateAsync({
        periodo_id: periodo.id,
        pessoa_id: formData.pessoaId,
        loja_id: periodo.loja_id,
        data_inicio: format(formData.dateRange.from, 'yyyy-MM-dd'),
        data_fim: format(formData.dateRange.to, 'yyyy-MM-dd'),
        dias,
        observacao: formData.observacao || undefined,
      });
      toast({ title: 'Férias solicitadas', description: `${dias} dia(s) enviados para aprovação.` });
      setShowSolicitarModal(false);
      setFormData({ pessoaId: '', dateRange: undefined, observacao: '' });
    } catch (e: any) {
      toast({ title: 'Erro ao solicitar', description: e?.message ?? 'Tente novamente.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Férias</h1>
          <p className="text-muted-foreground">Períodos aquisitivos e agendamentos</p>
        </div>
        <Button onClick={() => setShowSolicitarModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Solicitar Férias
        </Button>
      </div>

      {/* Alertas */}
      {vencidos.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">
              {vencidos.length} período(s) de férias vencido(s) — risco de pagamento em dobro
            </p>
            <p className="text-sm text-muted-foreground">
              {[...new Set(vencidos.map((v) => v.pessoa?.nome).filter(Boolean))].join(', ')}
            </p>
          </div>
        </div>
      )}
      {aVencer.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-500">
              {aVencer.length} período(s) vencendo nos próximos 90 dias
            </p>
            <p className="text-sm text-muted-foreground">
              {aVencer.map((v) => `${v.pessoa?.nome} (até ${fmt(v.concessivo_fim)})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Lista de períodos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Períodos aquisitivos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : periodos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum período de férias registrado.</p>
          ) : (
            <div className="space-y-2">
              {periodos.map((p) => {
                const s = STATUS[p.status] ?? { label: p.status, variant: 'secondary' as const };
                return (
                  <div key={p.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.pessoa?.nome ?? '—'}</p>
                      <p className="text-sm text-muted-foreground">
                        Aquisitivo {fmt(p.aquisicao_inicio)} – {fmt(p.aquisicao_fim)} · gozar até {fmt(p.concessivo_fim)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-none">
                      <span className="text-sm text-muted-foreground">{p.dias_saldo} dias</span>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
            <Button onClick={handleSolicitarFerias} disabled={solicitarFerias.isPending}>
              {solicitarFerias.isPending ? 'Enviando...' : 'Solicitar Férias'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
