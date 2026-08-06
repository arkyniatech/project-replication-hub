import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, Plus, Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { useSupabaseSolicitacoes } from '../hooks/useSupabaseSolicitacoes';

const TIPOS = [
  { value: 'ferias', label: 'Férias' },
  { value: 'ajuste_ponto', label: 'Ajuste de ponto' },
  { value: 'atualizacao_cadastral', label: 'Atualização cadastral' },
  { value: 'beneficio', label: 'Benefício' },
  { value: 'documento', label: 'Documento' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'desligamento', label: 'Desligamento' },
  { value: 'outro', label: 'Outro' },
];
const tipoLabel = (v: string) => TIPOS.find((t) => t.value === v)?.label ?? v;
const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  em_aprovacao: { label: 'Em aprovação', variant: 'outline' },
  aprovada: { label: 'Aprovada', variant: 'default' },
  reprovada: { label: 'Reprovada', variant: 'destructive' },
  cancelada: { label: 'Cancelada', variant: 'outline' },
};
const fmt = (d: string) => format(parseISO(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

export default function Aprovacoes() {
  const { pessoas } = useSupabasePessoas();
  const pessoasAtivas = pessoas.filter((p) => p.situacao === 'ativo');
  const { solicitacoes, isLoading, criar, decidir } = useSupabaseSolicitacoes();

  const [filtros, setFiltros] = useState({ tipo: 'all', status: 'all', busca: '' });
  const [showNova, setShowNova] = useState(false);
  const [nova, setNova] = useState({ pessoaId: '', tipo: 'ferias', titulo: '' });

  const filtradas = solicitacoes.filter(
    (s) =>
      (filtros.tipo === 'all' || s.tipo === filtros.tipo) &&
      (filtros.status === 'all' || s.status === filtros.status) &&
      (!filtros.busca || (s.pessoa?.nome ?? '').toLowerCase().includes(filtros.busca.toLowerCase())),
  );

  const handleCriar = async () => {
    const pessoa = pessoasAtivas.find((p) => p.id === nova.pessoaId);
    if (!pessoa || !nova.tipo) {
      toast({ title: 'Erro', description: 'Selecione colaborador e tipo.', variant: 'destructive' });
      return;
    }
    try {
      await criar.mutateAsync({ tipo: nova.tipo, pessoa, titulo: nova.titulo });
      toast({ title: 'Solicitação criada' });
      setShowNova(false);
      setNova({ pessoaId: '', tipo: 'ferias', titulo: '' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  const handleDecidir = async (id: string, decisao: 'aprovado' | 'reprovado') => {
    const motivo = decisao === 'reprovado' ? window.prompt('Motivo da reprovação (obrigatório):') ?? undefined : undefined;
    if (decisao === 'reprovado' && !motivo?.trim()) {
      toast({ title: 'Reprovação exige motivo', variant: 'destructive' });
      return;
    }
    try {
      await decidir.mutateAsync({ solicitacaoId: id, decisao, motivo });
      toast({ title: decisao === 'aprovado' ? 'Aprovada' : 'Reprovada' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Central de Aprovações</h1>
          <p className="text-muted-foreground">Solicitações e decisões</p>
        </div>
        <Button onClick={() => setShowNova(true)}><Plus className="h-4 w-4 mr-2" />Nova Solicitação</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Buscar por colaborador..." value={filtros.busca} onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} />
            <Select value={filtros.tipo} onValueChange={(v) => setFiltros({ ...filtros, tipo: v })}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtros.status} onValueChange={(v) => setFiltros({ ...filtros, status: v })}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="aprovada">Aprovadas</SelectItem>
                <SelectItem value="reprovada">Reprovadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Solicitações</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : filtradas.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma solicitação.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtradas.map((s) => {
                const st = STATUS[s.status] ?? { label: s.status, variant: 'secondary' as const };
                return (
                  <div key={s.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.pessoa?.nome ?? '—'} · {tipoLabel(s.tipo)}</p>
                      <p className="text-sm text-muted-foreground truncate">{s.titulo || '—'} · {fmt(s.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      <Badge variant={st.variant}>{st.label}</Badge>
                      {s.status === 'pendente' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleDecidir(s.id, 'aprovado')}><Check className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => handleDecidir(s.id, 'reprovado')}><X className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNova} onOpenChange={setShowNova}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Solicitação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={nova.pessoaId} onValueChange={(v) => setNova({ ...nova, pessoaId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {pessoasAtivas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={nova.tipo} onValueChange={(v) => setNova({ ...nova, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={nova.titulo} onChange={(e) => setNova({ ...nova, titulo: e.target.value })} placeholder="Resumo da solicitação" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNova(false)}>Cancelar</Button>
            <Button onClick={handleCriar} disabled={criar.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
