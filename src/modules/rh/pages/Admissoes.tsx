import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, UserPlus } from 'lucide-react';
import { useSupabaseRecrutamento } from '../hooks/useSupabaseRecrutamento';
import { useSupabaseLojas } from '../hooks/useSupabaseLojas';
import { RhQueryError } from '../components/RhQueryError';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import { formatDateBR, toISODateLocal } from '@/lib/date-utils';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente', EM_PROCESSO: 'Em Processo', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada',
};
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDENTE: 'secondary', EM_PROCESSO: 'default', CONCLUIDA: 'outline', CANCELADA: 'destructive',
};
const fmt = (d?: string | null) => formatDateBR(d, '—');

const EMPTY = { candidatoId: '', nome: '', lojaId: '', cargoId: '', dataPrevista: '', salario: '' };

export default function Admissoes() {
  const { can } = useRbacPermissions();
  const { admissoes, candidatos, vagas, cargos, isLoading, error, criarAdmissao, atualizarAdmissao } = useSupabaseRecrutamento();
  const { lojas } = useSupabaseLojas();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS_STATUS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const podeEditar = can('rh:pessoas_edit');
  const aprovadosSemAdmissao = candidatos.filter(
    (c) => c.status === 'APROVADO' && !admissoes.some((a) => a.candidato_id === c.id && a.status !== 'CANCELADA'),
  );

  const filtradas = admissoes.filter((a) => {
    if (statusFilter !== 'TODOS_STATUS' && a.status !== statusFilter) return false;
    if (searchTerm && !a.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const selecionarCandidato = (candidatoId: string) => {
    const c = aprovadosSemAdmissao.find((x) => x.id === candidatoId);
    if (!c) return setForm({ ...form, candidatoId });
    const vaga = vagas.find((v) => v.id === c.vaga_id);
    setForm({
      ...form,
      candidatoId,
      nome: c.nome,
      lojaId: c.loja_id,
      cargoId: vaga?.cargo_id ?? form.cargoId,
    });
  };

  const handleCriar = async () => {
    if (!form.nome.trim() || !form.lojaId) {
      toast.error('Preencha nome e loja.');
      return;
    }
    const candidato = aprovadosSemAdmissao.find((c) => c.id === form.candidatoId);
    try {
      await criarAdmissao.mutateAsync({
        candidato_id: candidato?.id ?? null,
        vaga_id: candidato?.vaga_id ?? null,
        loja_id: form.lojaId,
        cargo_id: form.cargoId || null,
        nome: form.nome.trim(),
        data_prevista: form.dataPrevista || null,
        salario: form.salario ? Number(form.salario) : null,
      });
      toast.success('Admissão iniciada.');
      setIsModalOpen(false);
      setForm(EMPTY);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao iniciar admissão.');
    }
  };

  const mudarStatus = async (a: { id: string }, status: string) => {
    try {
      const updates: any = { id: a.id, status };
      if (status === 'CONCLUIDA') updates.data_admissao = toISODateLocal(new Date());
      await atualizarAdmissao.mutateAsync(updates);
      toast.success(
        status === 'CONCLUIDA'
          ? 'Admissão concluída — cadastre o colaborador em Pessoas para liberar os módulos de RH.'
          : `Admissão ${STATUS_LABEL[status].toLowerCase()}.`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao atualizar admissão.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admissões</h1>
          <p className="text-muted-foreground">Processo de admissão de novos colaboradores</p>
        </div>
        {podeEditar && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Admissão</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Admissão</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Candidato aprovado</Label>
                  <Select value={form.candidatoId} onValueChange={selecionarCandidato}>
                    <SelectTrigger><SelectValue placeholder="Opcional — selecione..." /></SelectTrigger>
                    <SelectContent>
                      {aprovadosSemAdmissao.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome} — {c.vaga?.titulo ?? 'sem vaga'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Loja *</Label>
                    <Select value={form.lojaId} onValueChange={(v) => setForm({ ...form, lojaId: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {lojas.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Select value={form.cargoId} onValueChange={(v) => setForm({ ...form, cargoId: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {cargos.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data prevista</Label>
                    <Input type="date" value={form.dataPrevista} onChange={(e) => setForm({ ...form, dataPrevista: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Salário</Label>
                    <Input type="number" step="0.01" placeholder="0,00" value={form.salario} onChange={(e) => setForm({ ...form, salario: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={handleCriar} disabled={criarAdmissao.isPending}>
                    {criarAdmissao.isPending ? 'Iniciando...' : 'Iniciar Admissão'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS_STATUS">Todos os Status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="EM_PROCESSO">Em Processo</SelectItem>
                <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <RhQueryError error={error} />
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma admissão encontrada</h3>
              <p className="text-muted-foreground">Inicie uma nova admissão a partir de um candidato aprovado</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtradas.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.loja?.nome ?? '—'}{a.cargo?.nome ? ` · ${a.cargo.nome}` : ''} · prevista: {fmt(a.data_prevista)}
                    {a.data_admissao ? ` · admitido em ${fmt(a.data_admissao)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  {podeEditar && (a.status === 'PENDENTE' || a.status === 'EM_PROCESSO') && (
                    <>
                      {a.status === 'PENDENTE' && (
                        <Button size="sm" variant="outline" onClick={() => mudarStatus(a, 'EM_PROCESSO')}>Iniciar</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => mudarStatus(a, 'CONCLUIDA')}>Concluir</Button>
                      <Button size="sm" variant="outline" onClick={() => mudarStatus(a, 'CANCELADA')}>Cancelar</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
