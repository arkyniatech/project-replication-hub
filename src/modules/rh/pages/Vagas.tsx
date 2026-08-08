import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Briefcase } from 'lucide-react';
import { useSupabaseRecrutamento, type Vaga } from '../hooks/useSupabaseRecrutamento';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { RhQueryError } from '../components/RhQueryError';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import { toISODateLocal } from '@/lib/date-utils';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = { ABERTA: 'Aberta', EM_ANALISE: 'Em Análise', FECHADA: 'Fechada' };
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  ABERTA: 'default', EM_ANALISE: 'secondary', FECHADA: 'outline',
};

const EMPTY = { titulo: '', lojaId: '', cargoId: '', quantidade: '1', descricao: '' };

export default function Vagas() {
  const { can } = useRbacPermissions();
  const { vagas, cargos, isLoading, error, criarVaga, atualizarVaga } = useSupabaseRecrutamento();
  // só lojas que o usuário pode usar — a RLS recusaria as demais com erro cru
  const { lojasPermitidas: lojas } = useMultiunidade();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS_STATUS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const filtradas = vagas.filter((v) => {
    if (statusFilter !== 'TODOS_STATUS' && v.status !== statusFilter) return false;
    if (searchTerm && !v.titulo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleCriar = async () => {
    if (!form.titulo.trim() || !form.lojaId) {
      toast.error('Preencha título e loja.');
      return;
    }
    try {
      await criarVaga.mutateAsync({
        titulo: form.titulo.trim(),
        loja_id: form.lojaId,
        cargo_id: form.cargoId || null,
        quantidade: Math.max(1, parseInt(form.quantidade, 10) || 1),
        descricao: form.descricao || null,
      });
      toast.success('Vaga criada.');
      setIsModalOpen(false);
      setForm(EMPTY);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao criar vaga.');
    }
  };

  const mudarStatus = async (id: string, status: string) => {
    try {
      await atualizarVaga.mutateAsync({
        id, status: status as Vaga['status'],
        fechada_em: status === 'FECHADA' ? toISODateLocal(new Date()) : null,
      });
      toast.success(`Vaga ${STATUS_LABEL[status].toLowerCase()}.`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao atualizar vaga.');
    }
  };

  const podeEditar = can('rh:pessoas_edit');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Vagas</h1>
          <p className="text-muted-foreground">Gestão de vagas abertas e processo seletivo</p>
        </div>
        {podeEditar && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Vaga</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Vaga</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input placeholder="Ex: Auxiliar de Logística" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
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
                <div className="space-y-2">
                  <Label>Quantidade de posições</Label>
                  <Input type="number" min="1" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea placeholder="Requisitos, atividades..." value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={handleCriar} disabled={criarVaga.isPending}>
                    {criarVaga.isPending ? 'Criando...' : 'Criar Vaga'}
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
                <Input placeholder="Buscar vagas..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS_STATUS">Todos os Status</SelectItem>
                <SelectItem value="ABERTA">Aberta</SelectItem>
                <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                <SelectItem value="FECHADA">Fechada</SelectItem>
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
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma vaga encontrada</h3>
              <p className="text-muted-foreground">Crie uma nova vaga para iniciar o processo seletivo</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtradas.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{v.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    {v.loja?.nome ?? '—'}{v.cargo?.nome ? ` · ${v.cargo.nome}` : ''} · {v.quantidade} posição(ões)
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANT[v.status]}>{STATUS_LABEL[v.status]}</Badge>
                  {podeEditar && v.status === 'ABERTA' && (
                    <Button size="sm" variant="outline" onClick={() => mudarStatus(v.id, 'EM_ANALISE')}>Analisar</Button>
                  )}
                  {podeEditar && v.status !== 'FECHADA' && (
                    <Button size="sm" variant="outline" onClick={() => mudarStatus(v.id, 'FECHADA')}>Fechar</Button>
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
