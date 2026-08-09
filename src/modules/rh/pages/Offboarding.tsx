import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DoorOpen, Plus, Search } from 'lucide-react';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import {
  useSupabaseDesligamentos,
  MOTIVOS_DESLIGAMENTO,
  MOTIVOS_SIMULAVEIS,
  TIPOS_AVISO,
  type Desligamento,
} from '../hooks/useSupabaseDesligamentos';
import { RhQueryError } from '../components/RhQueryError';
import { formatDateBR, toISODateLocal } from '@/lib/date-utils';
import { toast } from 'sonner';

const motivoLabel = (v: string) => MOTIVOS_DESLIGAMENTO.find((m) => m.value === v)?.label ?? v;
const fmt = (d?: string | null) => formatDateBR(d, '—');

const STATUS_LABEL: Record<string, string> = { aberto: 'Em Andamento', concluido: 'Concluído', cancelado: 'Cancelado' };
const STATUS_VARIANT: Record<string, 'default' | 'outline' | 'destructive'> = {
  aberto: 'default', concluido: 'outline', cancelado: 'destructive',
};

const EMPTY = { pessoaId: '', motivo: '', tipoAviso: '', dataAlvo: '', observacoes: '' };
const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function Offboarding() {
  const { can } = useRbacPermissions();
  const podeEditar = can('rh:pessoas_edit');
  const { pessoas } = useSupabasePessoas();
  const { desligamentos, isLoading, error, criar, atualizar, simularRescisao } = useSupabaseDesligamentos();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNovoDesligamento, setShowNovoDesligamento] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [concluindo, setConcluindo] = useState<Desligamento | null>(null);
  const [dataEfetiva, setDataEfetiva] = useState('');

  const pessoasAtivas = pessoas.filter((p) => p.situacao === 'ativo');
  const emDesligamento = new Set(desligamentos.filter((d) => d.status === 'aberto').map((d) => d.pessoa_id));
  const elegiveis = pessoasAtivas.filter((p) => !emDesligamento.has(p.id));

  const filtrados = desligamentos.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (searchTerm && !(d.pessoa?.nome ?? '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleCriar = async () => {
    const pessoa = elegiveis.find((p) => p.id === form.pessoaId);
    if (!pessoa || !form.motivo) {
      toast.error('Selecione colaborador e motivo.');
      return;
    }
    if (!pessoa.lojaId) {
      toast.error('Este colaborador não tem loja definida.');
      return;
    }
    try {
      await criar.mutateAsync({
        pessoa_id: pessoa.id,
        loja_id: pessoa.lojaId,
        motivo: form.motivo,
        tipo_aviso: (form.tipoAviso || null) as Desligamento['tipo_aviso'],
        data_alvo: form.dataAlvo || null,
        observacoes: form.observacoes || null,
      });
      toast.success('Desligamento iniciado. Use Provisões para simular a rescisão.');
      setShowNovoDesligamento(false);
      setForm(EMPTY);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao iniciar desligamento.');
    }
  };

  const handleConcluir = async () => {
    if (!concluindo) return;
    if (!dataEfetiva) {
      toast.error('Informe a data efetiva do desligamento.');
      return;
    }
    try {
      await atualizar.mutateAsync({ id: concluindo.id, status: 'concluido', data_efetiva: dataEfetiva });
      toast.success('Desligamento concluído — vínculo encerrado e colaborador inativado.');
      setConcluindo(null);
      setDataEfetiva('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao concluir desligamento.');
    }
  };

  const handleCancelar = async (d: Desligamento) => {
    try {
      await atualizar.mutateAsync({ id: d.id, status: 'cancelado' });
      toast.success('Desligamento cancelado.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao cancelar.');
    }
  };

  const handleSimular = async (d: Desligamento) => {
    try {
      await simularRescisao.mutateAsync({
        id: d.id,
        pessoa_id: d.pessoa_id,
        motivo: d.motivo,
        data: d.data_alvo || toISODateLocal(new Date()),
      });
      toast.success('Rescisão simulada — custo estimado vinculado ao desligamento.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao simular rescisão.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Offboarding</h1>
          <p className="text-muted-foreground">Processo de desligamento</p>
        </div>
        {podeEditar && (
          <Button size="sm" onClick={() => setShowNovoDesligamento(true)}>
            <Plus className="h-4 w-4 mr-2" />Novo Desligamento
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por colaborador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="aberto">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <RhQueryError error={error} />
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <DoorOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum desligamento encontrado</h3>
              <p className="text-muted-foreground">Desligamentos aparecerão aqui quando iniciados</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{d.pessoa?.nome ?? '—'}</p>
                  <p className="text-sm text-muted-foreground">
                    {motivoLabel(d.motivo)} · alvo: {fmt(d.data_alvo)}
                    {d.data_efetiva ? ` · efetivado em ${fmt(d.data_efetiva)}` : ''}
                    {d.simulacao?.custo_empregador != null
                      ? ` · rescisão estimada: ${brl(Number(d.simulacao.custo_empregador))}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANT[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                  {podeEditar && d.status === 'aberto' && (
                    <>
                      {MOTIVOS_SIMULAVEIS.includes(d.motivo) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSimular(d)}
                          disabled={simularRescisao.isPending}
                        >
                          {d.simulacao ? 'Resimular' : 'Simular rescisão'}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setConcluindo(d); setDataEfetiva(d.data_alvo ?? ''); }}>
                        Concluir
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCancelar(d)}>Cancelar</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showNovoDesligamento} onOpenChange={setShowNovoDesligamento}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Desligamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={form.pessoaId} onValueChange={(v) => setForm({ ...form, pessoaId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                <SelectContent>
                  {elegiveis.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={form.motivo} onValueChange={(v) => setForm({ ...form, motivo: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS_DESLIGAMENTO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de aviso prévio</Label>
              <Select value={form.tipoAviso} onValueChange={(v) => setForm({ ...form, tipoAviso: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione (insumo do cálculo de rescisão)" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_AVISO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Alvo</Label>
              <Input type="date" value={form.dataAlvo} onChange={(e) => setForm({ ...form, dataAlvo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Observações sobre o desligamento..." value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNovoDesligamento(false)}>Cancelar</Button>
              <Button onClick={handleCriar} disabled={criar.isPending}>
                {criar.isPending ? 'Criando...' : 'Criar Desligamento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!concluindo} onOpenChange={(open) => !open && setConcluindo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Concluir Desligamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ao concluir, o vínculo vigente de <strong>{concluindo?.pessoa?.nome}</strong> será encerrado
              e o colaborador ficará inativo.
            </p>
            <div className="space-y-2">
              <Label>Data efetiva *</Label>
              <Input type="date" value={dataEfetiva} onChange={(e) => setDataEfetiva(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConcluindo(null)}>Voltar</Button>
              <Button onClick={handleConcluir} disabled={atualizar.isPending}>
                {atualizar.isPending ? 'Concluindo...' : 'Concluir Desligamento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
