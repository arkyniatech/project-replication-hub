import { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Loja {
  id?: string;
  codigo: string;
  nome: string;
  codigo_numerico?: number;
  ativo: boolean;
}

export function LojasForm() {
  const queryClient = useQueryClient();
  const [editingLoja, setEditingLoja] = useState<Loja | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Buscar lojas
  const { data: lojas = [], isLoading } = useQuery({
    queryKey: ['lojas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Criar loja
  const createMutation = useMutation({
    mutationFn: async (loja: Loja) => {
      // Buscar o maior codigo_numerico existente
      const { data: existingLojas } = await supabase
        .from('lojas')
        .select('codigo_numerico')
        .order('codigo_numerico', { ascending: false })
        .limit(1);
      
      const nextCodigoNumerico = existingLojas && existingLojas.length > 0 
        ? (existingLojas[0].codigo_numerico || 0) + 1 
        : 1;

      const { data, error } = await supabase
        .from('lojas')
        .insert([{
          codigo: loja.codigo,
          nome: loja.nome,
          codigo_numerico: nextCodigoNumerico,
          ativo: loja.ativo
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Auto-link: vincular o criador à nova loja
      if (data?.id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_lojas_permitidas').insert({
            user_id: user.id,
            loja_id: data.id,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      toast.success('Loja criada com sucesso!');
      setIsDialogOpen(false);
      setEditingLoja(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar loja: ${error.message}`);
    }
  });

  // Atualizar loja
  const updateMutation = useMutation({
    mutationFn: async (loja: Loja) => {
      const { data, error } = await supabase
        .from('lojas')
        .update({
          codigo: loja.codigo,
          nome: loja.nome,
          ativo: loja.ativo
        })
        .eq('id', loja.id!)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      toast.success('Loja atualizada com sucesso!');
      setIsDialogOpen(false);
      setEditingLoja(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar loja: ${error.message}`);
    }
  });

  // Deletar loja (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lojas')
        .update({ ativo: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      toast.success('Loja desativada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao desativar loja: ${error.message}`);
    }
  });

  const handleSave = () => {
    if (!editingLoja) return;

    if (!editingLoja.codigo || !editingLoja.nome) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingLoja.id) {
      updateMutation.mutate(editingLoja);
    } else {
      createMutation.mutate(editingLoja);
    }
  };

  const handleNew = () => {
    setEditingLoja({
      codigo: '',
      nome: '',
      ativo: true
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (loja: Loja) => {
    setEditingLoja(loja);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja desativar esta loja?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Gerenciar Lojas/Unidades
              </CardTitle>
              <CardDescription>
                Configure as lojas do sistema e gerencie permissões de acesso
              </CardDescription>
            </div>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Loja
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {lojas.map((loja) => (
              <div
                key={loja.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{loja.nome}</div>
                    <div className="text-sm text-muted-foreground">
                      Código: {loja.codigo} {loja.codigo_numerico && `• Nº ${String(loja.codigo_numerico).padStart(3, '0')}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${loja.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {loja.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(loja)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {loja.ativo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(loja.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {lojas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma loja cadastrada. Clique em "Nova Loja" para começar.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLoja?.id ? 'Editar Loja' : 'Nova Loja'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da loja/unidade
            </DialogDescription>
          </DialogHeader>

          {editingLoja && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={editingLoja.codigo}
                  onChange={(e) => setEditingLoja({ ...editingLoja, codigo: e.target.value })}
                  placeholder="Ex: SP, RJ, MG"
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={editingLoja.nome}
                  onChange={(e) => setEditingLoja({ ...editingLoja, nome: e.target.value })}
                  placeholder="Ex: Loja São Paulo"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="ativo">Loja Ativa</Label>
                <Switch
                  id="ativo"
                  checked={editingLoja.ativo}
                  onCheckedChange={(checked) => setEditingLoja({ ...editingLoja, ativo: checked })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingLoja(null);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
