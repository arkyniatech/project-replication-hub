import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plus, ClipboardList, Pencil, ClipboardCheck, XCircle } from 'lucide-react';
import { useSupabaseContagens } from '@/modules/almox/hooks/useSupabaseContagens';
import { useSupabaseCatalogo } from '@/modules/almox/hooks/useSupabaseCatalogo';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { useRbac } from '@/hooks/useRbac';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ContagemDigitacao from './ContagemDigitacao';
import ContagemRevisao from './ContagemRevisao';

const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  aberta: 'default',
  processada: 'outline',
  cancelada: 'secondary',
};

export default function ContagemAlmox() {
  const { can } = useRbac();
  const { lojaAtual } = useMultiunidade();
  const { contagens, isLoading, abrir, cancelar } = useSupabaseContagens(lojaAtual?.id);
  const { itens: catalogoItens } = useSupabaseCatalogo();

  // sessão ativa via query param — sub-rota faria a aba do ComprasLayout pular,
  // porque getCurrentTab() compara o path por igualdade exata.
  const [searchParams, setSearchParams] = useSearchParams();
  const contagemId = searchParams.get('contagem');
  const modo = searchParams.get('modo') ?? 'contar';

  const [showNova, setShowNova] = useState(false);
  const [form, setForm] = useState({
    tipo: 'TODOS' as 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL' | 'TODOS',
    grupo: '',
    incluirZerados: false,
    observacoes: '',
  });

  const podeProcessar = can('almox:contagem:processar');
  const grupos = [...new Set(catalogoItens.map(i => i.grupo).filter((g): g is string => !!g))];

  const abrirContagem = (id: string, m: 'contar' | 'revisar' = 'contar') =>
    setSearchParams({ contagem: id, modo: m });
  const voltarParaLista = () => setSearchParams({});

  const handleCriar = () => {
    if (!lojaAtual) { toast.error('Selecione uma loja'); return; }
    abrir.mutate(
      {
        lojaId: lojaAtual.id,
        tipo: form.tipo,
        grupo: form.grupo || null,
        incluirZerados: form.incluirZerados,
        observacoes: form.observacoes || null,
      },
      {
        onSuccess: (id) => {
          setShowNova(false);
          setForm({ tipo: 'TODOS', grupo: '', incluirZerados: false, observacoes: '' });
          abrirContagem(id, 'contar');
        },
      }
    );
  };

  // --- telas internas -------------------------------------------------
  if (contagemId && modo === 'revisar') {
    if (!podeProcessar) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            Você não tem permissão para revisar e processar contagens.
          </p>
          <Button variant="outline" onClick={() => abrirContagem(contagemId, 'contar')}>
            Voltar para a contagem
          </Button>
        </div>
      );
    }
    return <ContagemRevisao contagemId={contagemId} onVoltar={voltarParaLista} />;
  }

  if (contagemId) {
    return (
      <ContagemDigitacao
        contagemId={contagemId}
        onVoltar={voltarParaLista}
        onRevisar={() => abrirContagem(contagemId, 'revisar')}
        podeRevisar={podeProcessar}
      />
    );
  }

  // --- lista ----------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">Contagem Cega</h1>
          <p className="text-muted-foreground">Inventário físico do almoxarifado</p>
        </div>
        {podeProcessar && (
          <Button onClick={() => setShowNova(true)} className="min-h-[44px]">
            <Plus className="h-4 w-4 mr-2" />
            Nova Contagem
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contagens</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Divergências</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contagens.map((c) => {
                  const total = c.itens.length;
                  const contados = c.itens.filter(i => i.quantidade_contada !== null).length;
                  const divergencias = c.itens.filter(
                    i => i.quantidade_contada !== null && Number(i.quantidade_contada) !== Number(i.saldo_sistema)
                  ).length;
                  const progresso = total ? Math.round((contados / total) * 100) : 0;

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.numero}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.tipo}</Badge>
                        {c.grupo && <span className="ml-2 text-xs text-muted-foreground">{c.grupo}</span>}
                      </TableCell>
                      <TableCell className="w-[180px]">
                        <div className="flex items-center gap-2">
                          <Progress value={progresso} className="h-2 w-24" />
                          <span className="text-xs tabular-nums text-muted-foreground">{contados}/{total}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {divergencias > 0
                          ? <Badge variant="destructive">{divergencias}</Badge>
                          : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[c.status] ?? 'secondary'}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => abrirContagem(c.id, 'contar')} title="Contar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {podeProcessar && c.status === 'aberta' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => abrirContagem(c.id, 'revisar')} title="Revisar e processar">
                                <ClipboardCheck className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Cancelar contagem"
                                disabled={cancelar.isPending}
                                onClick={() => cancelar.mutate(c.id)}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {contagens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <ClipboardList className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Nenhuma contagem ainda.</p>
                      {podeProcessar && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Abra uma contagem para conferir o estoque físico.
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Nova contagem */}
      <Dialog open={showNova} onOpenChange={setShowNova}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova contagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de item</Label>
              <Select value={form.tipo} onValueChange={(v: any) => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os tipos</SelectItem>
                  {can('almox:patrimonial') && <SelectItem value="PATRIMONIAL">Patrimonial</SelectItem>}
                  <SelectItem value="PECA">Peças</SelectItem>
                  <SelectItem value="CONSUMIVEL">Consumíveis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Grupo (opcional)</Label>
              <Select
                value={form.grupo || '__todos__'}
                onValueChange={(v) => setForm(p => ({ ...p, grupo: v === '__todos__' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Todos os grupos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos os grupos</SelectItem>
                  {grupos.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="incluirZerados"
                checked={form.incluirZerados}
                onChange={(e) => setForm(p => ({ ...p, incluirZerados: e.target.checked }))}
              />
              <Label htmlFor="incluirZerados" className="cursor-pointer">
                Incluir itens com saldo zero
              </Label>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm(p => ({ ...p, observacoes: e.target.value }))}
                placeholder="Ex.: contagem trimestral do galpão"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              O saldo do sistema é congelado agora e não aparece para quem conta.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNova(false)}>Cancelar</Button>
              <Button onClick={handleCriar} disabled={abrir.isPending}>
                {abrir.isPending ? 'Abrindo...' : 'Abrir contagem'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
