import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Plus, AlertTriangle } from 'lucide-react';
import { useSupabaseSsma, TIPOS_ASO } from '../hooks/useSupabaseSsma';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { RhQueryError } from '../components/RhQueryError';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import { formatDateBR, toISODateLocal } from '@/lib/date-utils';
import { toast } from 'sonner';

const fmt = (d?: string | null) => formatDateBR(d, '—');
const hoje = () => toISODateLocal(new Date());
const em30dias = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return toISODateLocal(d);
};

function validadeBadge(validade?: string | null) {
  if (!validade) return <Badge variant="secondary">Sem validade</Badge>;
  if (validade < hoje()) return <Badge variant="destructive">Vencido</Badge>;
  if (validade <= em30dias()) return <Badge className="bg-amber-500 hover:bg-amber-500/90">Vence em breve</Badge>;
  return <Badge variant="outline">Válido</Badge>;
}

const EMPTY_ASO = { pessoaId: '', tipo: '', dataExame: '', validade: '', resultado: 'apto', medico: '' };
const EMPTY_TREIN = { pessoaId: '', norma: '', dataRealizacao: '', validade: '', cargaHoraria: '', instituicao: '' };

export default function SSMA() {
  const { can } = useRbacPermissions();
  const podeEditar = can('rh:pessoas_edit');
  const { asoExames, treinamentos, isLoading, error, registrarAso, registrarTreinamento } = useSupabaseSsma();
  const { pessoas } = useSupabasePessoas();
  const pessoasAtivas = pessoas.filter((p) => p.situacao === 'ativo');

  const [selectedTab, setSelectedTab] = useState('overview');
  const [modalAso, setModalAso] = useState(false);
  const [modalTrein, setModalTrein] = useState(false);
  const [formA, setFormA] = useState(EMPTY_ASO);
  const [formT, setFormT] = useState(EMPTY_TREIN);

  const asoVencidos = asoExames.filter((a) => a.validade && a.validade < hoje()).length;
  const asoVencendo = asoExames.filter((a) => a.validade && a.validade >= hoje() && a.validade <= em30dias()).length;
  const treinVencidos = treinamentos.filter((t) => t.validade && t.validade < hoje()).length;
  const treinVencendo = treinamentos.filter((t) => t.validade && t.validade >= hoje() && t.validade <= em30dias()).length;

  const pessoaLoja = (pessoaId: string) => pessoasAtivas.find((p) => p.id === pessoaId);

  const handleRegistrarAso = async () => {
    const pessoa = pessoaLoja(formA.pessoaId);
    if (!pessoa || !formA.tipo || !formA.dataExame) {
      toast.error('Preencha colaborador, tipo e data do exame.');
      return;
    }
    if (!pessoa.lojaId) {
      toast.error('Este colaborador não tem loja definida.');
      return;
    }
    try {
      await registrarAso.mutateAsync({
        pessoa_id: pessoa.id,
        loja_id: pessoa.lojaId,
        tipo: formA.tipo,
        data_exame: formA.dataExame,
        validade: formA.validade || null,
        resultado: formA.resultado,
        medico: formA.medico || null,
      });
      toast.success('ASO registrado.');
      setModalAso(false);
      setFormA(EMPTY_ASO);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao registrar ASO.');
    }
  };

  const handleRegistrarTreinamento = async () => {
    const pessoa = pessoaLoja(formT.pessoaId);
    if (!pessoa || !formT.norma.trim() || !formT.dataRealizacao) {
      toast.error('Preencha colaborador, norma e data de realização.');
      return;
    }
    if (!pessoa.lojaId) {
      toast.error('Este colaborador não tem loja definida.');
      return;
    }
    try {
      await registrarTreinamento.mutateAsync({
        pessoa_id: pessoa.id,
        loja_id: pessoa.lojaId,
        norma: formT.norma.trim().toUpperCase(),
        data_realizacao: formT.dataRealizacao,
        validade: formT.validade || null,
        carga_horaria_h: formT.cargaHoraria ? Number(formT.cargaHoraria) : null,
        instituicao: formT.instituicao || null,
      });
      toast.success('Treinamento registrado.');
      setModalTrein(false);
      setFormT(EMPTY_TREIN);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao registrar treinamento.');
    }
  };

  const selectPessoa = (value: string, onChange: (v: string) => void) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
      <SelectContent>
        {pessoasAtivas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">SSMA</h1>
          <p className="text-muted-foreground">Segurança, Saúde e Meio Ambiente</p>
        </div>
      </div>

      {error && <RhQueryError error={error} />}

      {!error && (
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="aso">ASO</TabsTrigger>
          <TabsTrigger value="treinamentos">NRs/Treinamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ASO vencidos</CardTitle></CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${asoVencidos > 0 ? 'text-destructive' : ''}`}>{asoVencidos}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ASO vencendo (30d)</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{asoVencendo}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Treinamentos vencidos</CardTitle></CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${treinVencidos > 0 ? 'text-destructive' : ''}`}>{treinVencidos}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Treinamentos vencendo (30d)</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{treinVencendo}</p></CardContent>
              </Card>
            </div>
          )}
          {!isLoading && asoExames.length === 0 && treinamentos.length === 0 && (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum registro de SSMA</h3>
                  <p className="text-muted-foreground">Cadastre exames ASO e treinamentos NR para acompanhar a conformidade</p>
                </div>
              </CardContent>
            </Card>
          )}
          {(asoVencidos > 0 || treinVencidos > 0) && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> Há registros vencidos — verifique as abas ASO e Treinamentos.
            </p>
          )}
        </TabsContent>

        <TabsContent value="aso" className="space-y-4">
          {podeEditar && (
            <div className="flex justify-end">
              <Dialog open={modalAso} onOpenChange={setModalAso}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Registrar ASO</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar ASO</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Colaborador *</Label>
                      {selectPessoa(formA.pessoaId, (v) => setFormA({ ...formA, pessoaId: v }))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo *</Label>
                        <Select value={formA.tipo} onValueChange={(v) => setFormA({ ...formA, tipo: v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {TIPOS_ASO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Resultado</Label>
                        <Select value={formA.resultado} onValueChange={(v) => setFormA({ ...formA, resultado: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apto">Apto</SelectItem>
                            <SelectItem value="apto_com_restricao">Apto com restrição</SelectItem>
                            <SelectItem value="inapto">Inapto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data do exame *</Label>
                        <Input type="date" value={formA.dataExame} onChange={(e) => setFormA({ ...formA, dataExame: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Validade</Label>
                        <Input type="date" value={formA.validade} onChange={(e) => setFormA({ ...formA, validade: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Médico</Label>
                      <Input placeholder="Nome do médico responsável" value={formA.medico} onChange={(e) => setFormA({ ...formA, medico: e.target.value })} />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1" onClick={handleRegistrarAso} disabled={registrarAso.isPending}>
                        {registrarAso.isPending ? 'Registrando...' : 'Registrar'}
                      </Button>
                      <Button variant="outline" onClick={() => setModalAso(false)}>Cancelar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {asoExames.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum exame ASO registrado</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {asoExames.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.pessoa?.nome ?? '—'}</p>
                      <p className="text-sm text-muted-foreground">
                        {TIPOS_ASO.find((t) => t.value === a.tipo)?.label ?? a.tipo} · exame: {fmt(a.data_exame)} · validade: {fmt(a.validade)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.resultado !== 'apto' && (
                        <Badge variant={a.resultado === 'inapto' ? 'destructive' : 'secondary'}>
                          {a.resultado === 'inapto' ? 'Inapto' : 'Apto c/ restrição'}
                        </Badge>
                      )}
                      {validadeBadge(a.validade)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="treinamentos" className="space-y-4">
          {podeEditar && (
            <div className="flex justify-end">
              <Dialog open={modalTrein} onOpenChange={setModalTrein}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Registrar Treinamento</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar Treinamento NR</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Colaborador *</Label>
                      {selectPessoa(formT.pessoaId, (v) => setFormT({ ...formT, pessoaId: v }))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Norma *</Label>
                        <Input placeholder="Ex: NR-10, NR-35" value={formT.norma} onChange={(e) => setFormT({ ...formT, norma: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Carga horária (h)</Label>
                        <Input type="number" value={formT.cargaHoraria} onChange={(e) => setFormT({ ...formT, cargaHoraria: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data de realização *</Label>
                        <Input type="date" value={formT.dataRealizacao} onChange={(e) => setFormT({ ...formT, dataRealizacao: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Validade</Label>
                        <Input type="date" value={formT.validade} onChange={(e) => setFormT({ ...formT, validade: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Instituição</Label>
                      <Input placeholder="Quem aplicou o treinamento" value={formT.instituicao} onChange={(e) => setFormT({ ...formT, instituicao: e.target.value })} />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1" onClick={handleRegistrarTreinamento} disabled={registrarTreinamento.isPending}>
                        {registrarTreinamento.isPending ? 'Registrando...' : 'Registrar'}
                      </Button>
                      <Button variant="outline" onClick={() => setModalTrein(false)}>Cancelar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {treinamentos.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum treinamento NR registrado</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {treinamentos.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.pessoa?.nome ?? '—'} · {t.norma}</p>
                      <p className="text-sm text-muted-foreground">
                        realizado: {fmt(t.data_realizacao)} · validade: {fmt(t.validade)}
                        {t.instituicao ? ` · ${t.instituicao}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0">{validadeBadge(t.validade)}</div>
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
