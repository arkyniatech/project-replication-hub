import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSupabaseChecklistTemplates } from '@/hooks/useSupabaseChecklistTemplates';
import { useSupabaseModelos } from '@/hooks/useSupabaseModelos';
import type { ChecklistTemplateItem, TipoChecklist } from '@/lib/checklist-os-utils';

const MODELO_GENERICO = '__generico__';

/** Item ainda sendo editado — id só é gerado ao salvar. */
type ItemRascunho = { chave: string; titulo: string; critico: boolean };

const novoItem = (): ItemRascunho => ({
  chave: crypto.randomUUID(),
  titulo: '',
  critico: false,
});

export default function ChecklistTemplates() {
  const { templates, isLoading, createTemplate, deleteTemplate } = useSupabaseChecklistTemplates();
  const { modelos } = useSupabaseModelos();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoChecklist>('CORRETIVA');
  const [modeloId, setModeloId] = useState<string>(MODELO_GENERICO);
  const [itens, setItens] = useState<ItemRascunho[]>([novoItem()]);

  const resetForm = () => {
    setTipo('CORRETIVA');
    setModeloId(MODELO_GENERICO);
    setItens([novoItem()]);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const atualizarItem = (chave: string, campos: Partial<ItemRascunho>) => {
    setItens((prev) => prev.map((i) => (i.chave === chave ? { ...i, ...campos } : i)));
  };

  const removerItem = (chave: string) => {
    setItens((prev) => prev.filter((i) => i.chave !== chave));
  };

  const itensPreenchidos = itens.filter((i) => i.titulo.trim().length > 0);
  const podeSalvar = itensPreenchidos.length > 0 && !createTemplate.isPending;

  const handleSalvar = async () => {
    const itensFinais: ChecklistTemplateItem[] = itensPreenchidos.map((i) => ({
      id: i.chave,
      titulo: i.titulo.trim(),
      critico: i.critico,
    }));

    await createTemplate.mutateAsync({
      tipo,
      modelo_id: modeloId === MODELO_GENERICO ? null : modeloId,
      itens: itensFinais,
    });

    handleCloseForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTemplate.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const nomeModelo = (t: any) =>
    t.modelo?.nome_comercial ??
    modelos.find((m) => m.id === t.modelo_id)?.nome_comercial ??
    null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Templates de Checklist</h2>
          <p className="text-muted-foreground">
            Define os itens que o mecânico confere antes de liberar um equipamento
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando templates...</div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="font-medium">Nenhum template cadastrado</p>
            <p className="text-sm mt-1">
              Sem ao menos um template, o checklist da OS não pode ser preenchido e o
              equipamento não é liberado.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Críticos</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => {
                const itensDoTemplate = Array.isArray(t.itens) ? t.itens : [];
                const criticos = itensDoTemplate.filter((i) => i.critico).length;
                const modelo = nomeModelo(t);
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge variant="outline">{t.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      {modelo ? (
                        modelo
                      ) : (
                        <Badge variant="secondary">Genérico (todos os modelos)</Badge>
                      )}
                    </TableCell>
                    <TableCell>{itensDoTemplate.length}</TableCell>
                    <TableCell>
                      {criticos > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {criticos}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Inativar template"
                        onClick={() => setDeleteId(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={formOpen} onOpenChange={(open) => (open ? setFormOpen(true) : handleCloseForm())}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Template de Checklist</DialogTitle>
            <DialogDescription>
              Os itens marcados como críticos bloqueiam a liberação do equipamento enquanto
              não forem aprovados pelo mecânico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" id="label-tipo-checklist">
                  Tipo de manutenção
                </label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoChecklist)}>
                  <SelectTrigger aria-labelledby="label-tipo-checklist">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREVENTIVA">Preventiva</SelectItem>
                    <SelectItem value="CORRETIVA">Corretiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" id="label-modelo-checklist">
                  Modelo de equipamento
                </label>
                <Select value={modeloId} onValueChange={setModeloId}>
                  <SelectTrigger aria-labelledby="label-modelo-checklist">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MODELO_GENERICO}>Genérico (todos os modelos)</SelectItem>
                    {modelos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome_comercial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O template específico do modelo tem prioridade sobre o genérico.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Itens do checklist</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setItens((prev) => [...prev, novoItem()])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar item
                </Button>
              </div>

              {itens.length === 0 && (
                <p className="text-sm text-muted-foreground border rounded p-3">
                  Nenhum item. Adicione ao menos um para salvar o template.
                </p>
              )}

              {itens.map((item, index) => (
                <div key={item.chave} className="flex items-start gap-2 border rounded p-3">
                  <GripVertical className="h-4 w-4 mt-2.5 text-muted-foreground shrink-0" />

                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.titulo}
                      placeholder={`Item ${index + 1} — ex.: Verificar nível de óleo`}
                      onChange={(e) => atualizarItem(item.chave, { titulo: e.target.value })}
                    />

                    {/* O crítico decide se a OS pode ser liberada: rótulo explícito
                        e consequência escrita, não um checkbox mudo. */}
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id={`critico-${item.chave}`}
                        checked={item.critico}
                        onCheckedChange={(checked) =>
                          atualizarItem(item.chave, { critico: !!checked })
                        }
                      />
                      <div className="grid gap-0.5 leading-none">
                        <label
                          htmlFor={`critico-${item.chave}`}
                          className="text-sm font-medium cursor-pointer inline-flex items-center gap-1.5"
                        >
                          Item crítico
                          {item.critico && (
                            <Badge variant="destructive" className="text-[10px] py-0">
                              BLOQUEIA A LIBERAÇÃO
                            </Badge>
                          )}
                        </label>
                        <span className="text-xs text-muted-foreground">
                          Se marcado, o equipamento não pode ser liberado enquanto este item
                          não for aprovado.
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Remover item"
                    onClick={() => removerItem(item.chave)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={!podeSalvar}>
              {createTemplate.isPending ? 'Salvando...' : 'Salvar Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar template?</AlertDialogTitle>
            <AlertDialogDescription>
              O template deixa de ser oferecido em novas OS. Os checklists já executados
              continuam guardados nas OS existentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
