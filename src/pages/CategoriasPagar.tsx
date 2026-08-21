import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Plus, Search, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { useSupabaseCategoriasN2, CategoriaN2 } from '@/hooks/useSupabaseCategoriasN2';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const FORM_VAZIO = { nome: '', tipo: 'DESPESA' };

export default function CategoriasPagar() {
  const {
    categoriasTodas,
    isLoadingTodas,
    createCategoria,
    updateCategoria,
    inativarCategoria,
  } = useSupabaseCategoriasN2();
  const { can } = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [inativarId, setInativarId] = useState<string | null>(null);

  // Gate por PAPEL (mapa papel->permissão do usePermissions), não por claim:
  // não existe claim de contas a pagar, e reaproveitar financeiro.cr:config
  // (contas a RECEBER) criaria vínculo falso. Quem lança título é quem
  // cadastra categoria. A proteção real é a RLS — isto só evita oferecer
  // botão que vai falhar.
  const podeEscrever = can('financeiro', 'criar');

  const filteredCategorias = categoriasTodas.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNova = () => {
    setEditingId(null);
    setForm(FORM_VAZIO);
    setFormOpen(true);
  };

  const handleEdit = (categoria: CategoriaN2) => {
    setEditingId(categoria.id);
    setForm({ nome: categoria.nome, tipo: categoria.tipo });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (editingId) {
      await updateCategoria.mutateAsync({ id: editingId, nome: form.nome.trim(), tipo: form.tipo });
    } else {
      await createCategoria.mutateAsync({ nome: form.nome.trim(), tipo: form.tipo, ativo: true });
    }
    setFormOpen(false);
  };

  const handleInativar = async () => {
    if (inativarId) {
      await inativarCategoria.mutateAsync(inativarId);
      setInativarId(null);
    }
  };

  const handleReativar = async (id: string) => {
    await updateCategoria.mutateAsync({ id, ativo: true });
  };

  const salvando = createCategoria.isPending || updateCategoria.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Categorias</h2>
          <p className="text-muted-foreground">
            Cadastre e gerencie as categorias dos títulos a pagar
          </p>
        </div>
        {podeEscrever && (
          <Button onClick={handleNova} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Categoria
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card>
        {isLoadingTodas ? (
          <div className="p-8 text-center text-muted-foreground">
            Carregando categorias...
          </div>
        ) : filteredCategorias.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm
              ? 'Nenhuma categoria encontrada.'
              : 'Nenhuma categoria cadastrada. Clique em "Nova Categoria" para começar.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategorias.map((categoria) => (
                <TableRow
                  key={categoria.id}
                  className={categoria.ativo ? undefined : 'opacity-60'}
                >
                  <TableCell className="font-medium">{categoria.nome}</TableCell>
                  <TableCell>
                    <Badge variant={categoria.tipo === 'RECEITA' ? 'outline' : 'secondary'}>
                      {categoria.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={categoria.ativo ? 'default' : 'secondary'}>
                      {categoria.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {podeEscrever && (
                      <div className="flex items-center justify-end gap-2">
                        {categoria.ativo ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(categoria)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setInativarId(categoria.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleReativar(categoria.id)}
                            disabled={updateCategoria.isPending}
                          >
                            <RotateCcw className="h-4 w-4" />
                            Reativar
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoria-nome">Nome *</Label>
              <Input
                id="categoria-nome"
                placeholder="Ex.: Manutenção de frota"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(tipo) => setForm({ ...form, tipo })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESPESA">Despesa</SelectItem>
                  <SelectItem value="RECEITA">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!inativarId} onOpenChange={() => setInativarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar inativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar esta categoria? Ela deixa de aparecer
              ao lançar novos títulos, mas o histórico é preservado e você pode
              reativá-la depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleInativar}>
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
