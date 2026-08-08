import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Users, Plus } from 'lucide-react';
import { useSupabaseRecrutamento, type Candidato } from '../hooks/useSupabaseRecrutamento';
import { RhQueryError } from '../components/RhQueryError';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = {
  NOVO: 'Novo', EM_PROCESSO: 'Em Processo', APROVADO: 'Aprovado', REPROVADO: 'Reprovado',
};
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  NOVO: 'secondary', EM_PROCESSO: 'default', APROVADO: 'outline', REPROVADO: 'destructive',
};

const EMPTY = { vagaId: '', nome: '', email: '', telefone: '', origem: '' };

export default function Candidatos() {
  const { can } = useRbacPermissions();
  const { candidatos, vagas, isLoading, error, criarCandidato, atualizarCandidato } = useSupabaseRecrutamento();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS_STATUS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const vagasAbertas = vagas.filter((v) => v.status !== 'FECHADA');
  const podeEditar = can('rh:pessoas_edit');

  const filtrados = candidatos.filter((c) => {
    if (statusFilter !== 'TODOS_STATUS' && c.status !== statusFilter) return false;
    if (searchTerm && !c.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleCriar = async () => {
    const vaga = vagasAbertas.find((v) => v.id === form.vagaId);
    if (!vaga || !form.nome.trim()) {
      toast.error('Preencha vaga e nome do candidato.');
      return;
    }
    try {
      await criarCandidato.mutateAsync({
        vaga_id: vaga.id,
        loja_id: vaga.loja_id,
        nome: form.nome.trim(),
        email: form.email || null,
        telefone: form.telefone || null,
        origem: form.origem || null,
      });
      toast.success('Candidato registrado.');
      setIsModalOpen(false);
      setForm(EMPTY);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao registrar candidato.');
    }
  };

  const mudarStatus = async (id: string, status: string) => {
    try {
      await atualizarCandidato.mutateAsync({ id, status: status as Candidato['status'] });
      toast.success(`Candidato: ${STATUS_LABEL[status].toLowerCase()}.`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao atualizar candidato.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Candidatos</h1>
          <p className="text-muted-foreground">Gestão de candidatos por vaga</p>
        </div>
        {podeEditar && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Candidato</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Candidato</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Vaga *</Label>
                  <Select value={form.vagaId} onValueChange={(v) => setForm({ ...form, vagaId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {vagasAbertas.map((v) => <SelectItem key={v.id} value={v.id}>{v.titulo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {vagasAbertas.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma vaga aberta — crie uma vaga primeiro.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Input placeholder="Ex: indicação, site, agência..." value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={handleCriar} disabled={criarCandidato.isPending}>
                    {criarCandidato.isPending ? 'Registrando...' : 'Registrar'}
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
                <Input placeholder="Buscar candidatos..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS_STATUS">Todos os Status</SelectItem>
                <SelectItem value="NOVO">Novo</SelectItem>
                <SelectItem value="EM_PROCESSO">Em Processo</SelectItem>
                <SelectItem value="APROVADO">Aprovado</SelectItem>
                <SelectItem value="REPROVADO">Reprovado</SelectItem>
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
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum candidato encontrado</h3>
              <p className="text-muted-foreground">Registre candidatos nas vagas abertas</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.nome}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {c.vaga?.titulo ?? 'Vaga removida'}
                    {c.email ? ` · ${c.email}` : ''}{c.telefone ? ` · ${c.telefone}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                  {podeEditar && (c.status === 'NOVO' || c.status === 'EM_PROCESSO') && (
                    <>
                      {c.status === 'NOVO' && (
                        <Button size="sm" variant="outline" onClick={() => mudarStatus(c.id, 'EM_PROCESSO')}>Iniciar processo</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => mudarStatus(c.id, 'APROVADO')}>Aprovar</Button>
                      <Button size="sm" variant="outline" onClick={() => mudarStatus(c.id, 'REPROVADO')}>Reprovar</Button>
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
