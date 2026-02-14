import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useSupabaseFornecedores } from '@/hooks/useSupabaseFornecedores';
import { FornecedorForm } from '@/components/equipamentos/FornecedorForm';
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
import { Badge } from '@/components/ui/badge';

export default function Fornecedores() {
  const { fornecedores, isLoading, deleteFornecedor } = useSupabaseFornecedores();
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredFornecedores = fornecedores.filter((f) =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cnpj?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (id: string) => {
    setEditingId(id);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteFornecedor.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingId(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Fornecedores</h2>
          <p className="text-muted-foreground">
            Cadastre e gerencie seus fornecedores
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Carregando fornecedores...
          </div>
        ) : filteredFornecedores.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm
              ? 'Nenhum fornecedor encontrado.'
              : 'Nenhum fornecedor cadastrado. Clique em "Novo Fornecedor" para começar.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFornecedores.map((fornecedor) => (
                <TableRow key={fornecedor.id}>
                  <TableCell className="font-mono font-medium">
                    {fornecedor.codigo}
                  </TableCell>
                  <TableCell className="font-medium">
                    {fornecedor.nome}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fornecedor.razao_social || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {fornecedor.cnpj || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={fornecedor.ativo ? 'default' : 'secondary'}>
                      {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(fornecedor.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(fornecedor.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <FornecedorForm
        open={formOpen}
        onClose={handleCloseForm}
        editingId={editingId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar este fornecedor? Esta ação pode ser revertida posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
