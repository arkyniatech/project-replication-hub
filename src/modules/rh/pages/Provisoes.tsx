import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { useSimularRescisao, useRescisaoResultado } from '../hooks/useSupabaseProvisoes';

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const MOTIVOS = [
  { value: 'sem_justa_causa', label: 'Dispensa sem justa causa' },
  { value: 'pedido_demissao', label: 'Pedido de demissão' },
  { value: 'acordo_484a', label: 'Acordo (art. 484-A)' },
];

export default function Provisoes() {
  const { pessoas } = useSupabasePessoas();
  const ativos = pessoas.filter((p) => p.situacao === 'ativo');
  const simular = useSimularRescisao();
  const [form, setForm] = useState({ pessoaId: '', motivo: 'sem_justa_causa', data: format(new Date(), 'yyyy-MM-dd') });
  const [simId, setSimId] = useState<string | null>(null);
  const { data: resultado, isLoading: loadingResultado } = useRescisaoResultado(simId);

  const handleSimular = async () => {
    if (!form.pessoaId || !form.data) {
      toast({ title: 'Erro', description: 'Selecione o colaborador e a data.', variant: 'destructive' });
      return;
    }
    try {
      const id = await simular.mutateAsync({ pessoaId: form.pessoaId, motivo: form.motivo, data: form.data });
      setSimId(id);
    } catch (e: any) {
      toast({ title: 'Erro ao simular', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Provisões &amp; Rescisões</h1>
        <p className="text-muted-foreground">Simulador de custo de rescisão (Fase 1)</p>
      </div>

      {/* Aviso legal — obrigatório */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-none" />
        <div className="text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-500">Estimativa — não substitui o cálculo oficial</p>
          <p className="text-muted-foreground">
            Ferramenta gerencial e de conferência. Os valores são aproximados (dependem de saldo de FGTS oficial, médias e
            parâmetros a validar). <strong>Homologue com o contador e o advogado trabalhista antes de usar para valer.</strong>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Simular rescisão</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={form.pessoaId} onValueChange={(v) => setForm({ ...form, pessoaId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {ativos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={form.motivo} onValueChange={(v) => setForm({ ...form, motivo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data do desligamento *</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
          </div>
          <Button className="mt-4" onClick={handleSimular} disabled={simular.isPending}>
            <Calculator className="h-4 w-4 mr-2" />{simular.isPending ? 'Calculando...' : 'Simular'}
          </Button>
        </CardContent>
      </Card>

      {simId && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Resultado (estimativa)</CardTitle></CardHeader>
          <CardContent>
            {loadingResultado ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="space-y-1">
                  {resultado?.itens.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{i.rubrica}</p>
                        <p className="text-xs text-muted-foreground">{i.descricao}</p>
                      </div>
                      <span className="font-medium tabular-nums">{brl(Number(i.valor))}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="font-semibold">Custo estimado do empregador</span>
                  <span className="text-xl font-bold">{brl(resultado?.total ?? 0)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  ⚠️ Estimativa · versão v1 · conferir cada rubrica com a contabilidade. Não inclui INSS/IRRF do colaborador (fora do escopo da Fase 1).
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
