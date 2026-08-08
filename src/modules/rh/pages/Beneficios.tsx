import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BadgeCheck, Plus, Search, Users, X } from 'lucide-react';
import { useSupabaseBeneficios, TIPOS_BENEFICIO } from '../hooks/useSupabaseBeneficios';
import { useSupabaseRecrutamento } from '../hooks/useSupabaseRecrutamento';
import { RhQueryError } from '../components/RhQueryError';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import { toISODateLocal } from '@/lib/date-utils';
import { toast } from 'sonner';

const tipoLabel = (v: string) => TIPOS_BENEFICIO.find((t) => t.value === v)?.label ?? v;
const brl = (v?: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const EMPTY_BENEFICIO = { nome: '', tipo: '', valor: '', provedor: '', politica: '' };
const EMPTY_VINCULO = { beneficioId: '', pessoaId: '', valor: '' };
const EMPTY_ELEG = { beneficioId: '', cargoId: '', regra: '' };

export default function Beneficios() {
  const { can } = useRbacPermissions();
  const podeEditar = can('rh:pessoas_edit');
  const {
    beneficios, elegibilidade, vinculos, isLoading, error,
    criarBeneficio, atualizarBeneficio, definirElegibilidade, removerElegibilidade, vincular, encerrarVinculo,
  } = useSupabaseBeneficios();
  const { cargos } = useSupabaseRecrutamento();
  const { pessoas } = useSupabasePessoas();
  const pessoasAtivas = pessoas.filter((p) => p.situacao === 'ativo');

  const [selectedTab, setSelectedTab] = useState('catalogo');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalBeneficio, setModalBeneficio] = useState(false);
  const [modalVinculo, setModalVinculo] = useState(false);
  const [modalEleg, setModalEleg] = useState(false);
  const [formB, setFormB] = useState(EMPTY_BENEFICIO);
  const [formV, setFormV] = useState(EMPTY_VINCULO);
  const [formE, setFormE] = useState(EMPTY_ELEG);

  const beneficiosFiltrados = beneficios.filter(
    (b) => !searchTerm || b.nome.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCriarBeneficio = async () => {
    if (!formB.nome.trim() || !formB.tipo) {
      toast.error('Preencha nome e tipo.');
      return;
    }
    try {
      await criarBeneficio.mutateAsync({
        nome: formB.nome.trim(),
        tipo: formB.tipo,
        valor_mensal: formB.valor ? Number(formB.valor) : null,
        provedor: formB.provedor || null,
        politica: formB.politica || null,
      });
      toast.success('Benefício criado.');
      setModalBeneficio(false);
      setFormB(EMPTY_BENEFICIO);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao criar benefício.');
    }
  };

  const handleVincular = async () => {
    const pessoa = pessoasAtivas.find((p) => p.id === formV.pessoaId);
    if (!formV.beneficioId || !pessoa) {
      toast.error('Selecione benefício e colaborador.');
      return;
    }
    if (!pessoa.lojaId) {
      toast.error('Este colaborador não tem loja definida.');
      return;
    }
    const jaAtivo = vinculos.some(
      (v) => v.beneficio_id === formV.beneficioId && v.pessoa_id === pessoa.id && v.status === 'ativo',
    );
    if (jaAtivo) {
      toast.error('Este colaborador já tem um vínculo ativo com esse benefício.');
      return;
    }
    try {
      await vincular.mutateAsync({
        beneficio_id: formV.beneficioId,
        pessoa_id: pessoa.id,
        loja_id: pessoa.lojaId,
        valor_mensal: formV.valor ? Number(formV.valor) : null,
        data_inicio: toISODateLocal(new Date()),
      });
      toast.success('Benefício vinculado.');
      setModalVinculo(false);
      setFormV(EMPTY_VINCULO);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao vincular.');
    }
  };

  const handleElegibilidade = async () => {
    if (!formE.beneficioId || !formE.cargoId) {
      toast.error('Selecione benefício e cargo.');
      return;
    }
    try {
      await definirElegibilidade.mutateAsync({
        beneficio_id: formE.beneficioId,
        cargo_id: formE.cargoId,
        regra: formE.regra || undefined,
      });
      toast.success('Elegibilidade definida.');
      setModalEleg(false);
      setFormE(EMPTY_ELEG);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao definir elegibilidade.');
    }
  };

  const handleEncerrarVinculo = async (id: string) => {
    try {
      await encerrarVinculo.mutateAsync({ id, data_fim: toISODateLocal(new Date()) });
      toast.success('Vínculo encerrado.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao encerrar vínculo.');
    }
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    try {
      await atualizarBeneficio.mutateAsync({ id, ativo });
      toast.success(ativo ? 'Benefício ativado.' : 'Benefício desativado.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao atualizar benefício.');
    }
  };

  const handleRemoverElegibilidade = async (id: string) => {
    try {
      await removerElegibilidade.mutateAsync(id);
      toast.success('Regra de elegibilidade removida.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao remover elegibilidade.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Benefícios</h1>
          <p className="text-muted-foreground">Gestão de benefícios e elegibilidade</p>
        </div>
        {podeEditar && (
          <Dialog open={modalBeneficio} onOpenChange={setModalBeneficio}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Benefício</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Benefício</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Benefício *</Label>
                  <Input placeholder="Ex: Vale Alimentação" value={formB.nome} onChange={(e) => setFormB({ ...formB, nome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={formB.tipo} onValueChange={(v) => setFormB({ ...formB, tipo: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_BENEFICIO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Mensal</Label>
                    <Input type="number" step="0.01" placeholder="0,00" value={formB.valor} onChange={(e) => setFormB({ ...formB, valor: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Provedor</Label>
                    <Input placeholder="Ex: Sodexo" value={formB.provedor} onChange={(e) => setFormB({ ...formB, provedor: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Política</Label>
                  <Textarea placeholder="Descreva quando e como o benefício se aplica..." value={formB.politica} onChange={(e) => setFormB({ ...formB, politica: e.target.value })} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={handleCriarBeneficio} disabled={criarBeneficio.isPending}>
                    {criarBeneficio.isPending ? 'Criando...' : 'Criar Benefício'}
                  </Button>
                  <Button variant="outline" onClick={() => setModalBeneficio(false)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && <RhQueryError error={error} />}

      {!error && (
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="elegibilidade">Elegibilidade</TabsTrigger>
          <TabsTrigger value="vinculos">Vínculos</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Buscar benefícios..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : beneficiosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <BadgeCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum benefício cadastrado</h3>
                  <p className="text-muted-foreground">Adicione benefícios para gerenciar a elegibilidade dos colaboradores</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {beneficiosFiltrados.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{b.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {tipoLabel(b.tipo)} · {brl(b.valor_mensal)}{b.provedor ? ` · ${b.provedor}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={b.ativo ? 'default' : 'outline'}>{b.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      {podeEditar && (
                        <Button size="sm" variant="outline" onClick={() => handleToggleAtivo(b.id, !b.ativo)}>
                          {b.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="elegibilidade" className="space-y-4">
          {podeEditar && (
            <div className="flex justify-end">
              <Dialog open={modalEleg} onOpenChange={setModalEleg}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Definir Elegibilidade</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Elegibilidade por Cargo</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Benefício *</Label>
                      <Select value={formE.beneficioId} onValueChange={(v) => setFormE({ ...formE, beneficioId: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {beneficios.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cargo *</Label>
                      <Select value={formE.cargoId} onValueChange={(v) => setFormE({ ...formE, cargoId: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {cargos.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Regra</Label>
                      <Input placeholder="Ex: após período de experiência" value={formE.regra} onChange={(e) => setFormE({ ...formE, regra: e.target.value })} />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1" onClick={handleElegibilidade} disabled={definirElegibilidade.isPending}>Salvar</Button>
                      <Button variant="outline" onClick={() => setModalEleg(false)}>Cancelar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {elegibilidade.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma regra de elegibilidade definida</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {elegibilidade.map((e) => (
                <Card key={e.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.beneficio?.nome ?? '—'} → {e.cargo?.nome ?? '—'}</p>
                      {e.regra && <p className="text-sm text-muted-foreground">{e.regra}</p>}
                    </div>
                    {podeEditar && (
                      <Button size="icon" variant="ghost" onClick={() => handleRemoverElegibilidade(e.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="vinculos" className="space-y-4">
          {podeEditar && (
            <div className="flex justify-end">
              <Dialog open={modalVinculo} onOpenChange={setModalVinculo}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Vincular Colaborador</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Vincular Benefício</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Benefício *</Label>
                      <Select value={formV.beneficioId} onValueChange={(v) => setFormV({ ...formV, beneficioId: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {beneficios.filter((b) => b.ativo).map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Colaborador *</Label>
                      <Select value={formV.pessoaId} onValueChange={(v) => setFormV({ ...formV, pessoaId: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {pessoasAtivas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor customizado</Label>
                      <Input type="number" step="0.01" placeholder="Vazio = valor do catálogo" value={formV.valor} onChange={(e) => setFormV({ ...formV, valor: e.target.value })} />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1" onClick={handleVincular} disabled={vincular.isPending}>Vincular</Button>
                      <Button variant="outline" onClick={() => setModalVinculo(false)}>Cancelar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {vinculos.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum colaborador com benefício vinculado</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {vinculos.map((v) => (
                <Card key={v.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{v.pessoa?.nome ?? '—'}</p>
                      <p className="text-sm text-muted-foreground">
                        {v.beneficio?.nome ?? '—'} · {brl(v.valor_mensal ?? v.beneficio?.valor_mensal)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={v.status === 'ativo' ? 'default' : 'outline'}>{v.status}</Badge>
                      {podeEditar && v.status === 'ativo' && (
                        <Button size="sm" variant="outline" onClick={() => handleEncerrarVinculo(v.id)}>Encerrar</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
