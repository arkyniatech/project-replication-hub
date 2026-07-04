import { useState } from 'react';
import { Building2, FolderKanban, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGruposLojas } from '@/hooks/useGruposLojas';

interface Loja {
  id?: string;
  codigo: string;
  nome: string;
  codigo_numerico?: number;
  ativo: boolean;
  grupo_id?: string | null;
}

// Valor sentinela do <select> para "criar novo grupo"
const NOVO_GRUPO = '__novo__';

export function LojasForm() {
  const queryClient = useQueryClient();
  const [editingLoja, setEditingLoja] = useState<Loja | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Grupos de lojas (franquias)
  const { grupos, createGrupo, updateGrupo } = useGruposLojas();
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>('');
  const [novoGrupoNome, setNovoGrupoNome] = useState('');
  const [editandoGrupo, setEditandoGrupo] = useState<{ id: string; nome: string } | null>(null);
  const [novoGrupoCard, setNovoGrupoCard] = useState('');

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
          ativo: loja.ativo,
          grupo_id: loja.grupo_id ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any])
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
          ativo: loja.ativo,
          grupo_id: loja.grupo_id ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
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

  const handleSave = async () => {
    if (!editingLoja) return;

    if (!editingLoja.codigo || !editingLoja.nome) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Resolver grupo: existente, novo ou nenhum
    let grupoId: string | null = null;
    if (grupoSelecionado === NOVO_GRUPO) {
      if (!novoGrupoNome.trim()) {
        toast.error('Informe o nome do novo grupo');
        return;
      }
      try {
        const novoGrupo = await createGrupo.mutateAsync({ nome: novoGrupoNome });
        grupoId = novoGrupo.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        toast.error(`Erro ao criar grupo: ${error.message}`);
        return;
      }
    } else if (grupoSelecionado) {
      grupoId = grupoSelecionado;
    }

    const lojaFinal = { ...editingLoja, grupo_id: grupoId };

    if (lojaFinal.id) {
      updateMutation.mutate(lojaFinal);
    } else {
      createMutation.mutate(lojaFinal);
    }
  };

  const handleNew = () => {
    setEditingLoja({
      codigo: '',
      nome: '',
      ativo: true
    });
    // Pré-seleciona o único grupo existente (caso comum: um grupo só)
    setGrupoSelecionado(grupos.length === 1 ? grupos[0].id : '');
    setNovoGrupoNome('');
    setIsDialogOpen(true);
  };

  const handleEdit = (loja: Loja) => {
    setEditingLoja(loja);
    setGrupoSelecionado(loja.grupo_id || '');
    setNovoGrupoNome('');
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
                    <div className="font-medium flex items-center gap-2">
                      {loja.nome}
                      {(loja as Loja).grupo_id && (
                        <Badge variant="outline" className="text-xs font-normal">
                          <FolderKanban className="h-3 w-3 mr-1" />
                          {grupos.find(g => g.id === (loja as Loja).grupo_id)?.nome || 'Grupo'}
                        </Badge>
                      )}
                    </div>
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

      {/* Grupos de Lojas */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Grupos de Lojas
          </CardTitle>
          <CardDescription>
            Agrupe franquias — funcionários vinculados a um grupo enxergam todas as lojas dele, inclusive novas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {grupos.map(grupo => {
              const lojasDoGrupo = lojas.filter((l) => (l as Loja).grupo_id === grupo.id);
              const emEdicao = editandoGrupo?.id === grupo.id;
              return (
                <div key={grupo.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    {emEdicao ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editandoGrupo.nome}
                          onChange={(e) => setEditandoGrupo({ ...editandoGrupo, nome: e.target.value })}
                          className="max-w-xs"
                        />
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!editandoGrupo.nome.trim()) return;
                            try {
                              await updateGrupo.mutateAsync({ id: grupo.id, updates: { nome: editandoGrupo.nome.trim() } });
                              toast.success('Grupo renomeado!');
                              setEditandoGrupo(null);
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            } catch (error: any) {
                              toast.error(`Erro ao renomear: ${error.message}`);
                            }
                          }}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditandoGrupo(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium flex items-center gap-2">
                          {grupo.nome}
                          {!grupo.ativo && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {lojasDoGrupo.length === 0
                            ? 'Nenhuma loja'
                            : lojasDoGrupo.map(l => l.nome).join(', ')}
                        </div>
                      </>
                    )}
                  </div>
                  {!emEdicao && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditandoGrupo({ id: grupo.id, nome: grupo.nome })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
            {grupos.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Nenhum grupo criado ainda.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              value={novoGrupoCard}
              onChange={(e) => setNovoGrupoCard(e.target.value)}
              placeholder="Nome do novo grupo"
              className="max-w-xs"
            />
            <Button
              variant="outline"
              disabled={!novoGrupoCard.trim() || createGrupo.isPending}
              onClick={async () => {
                try {
                  await createGrupo.mutateAsync({ nome: novoGrupoCard });
                  toast.success('Grupo criado!');
                  setNovoGrupoCard('');
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (error: any) {
                  toast.error(`Erro ao criar grupo: ${error.message}`);
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Grupo
            </Button>
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

              <div className="space-y-2">
                <Label htmlFor="grupo">Grupo</Label>
                <select
                  id="grupo"
                  value={grupoSelecionado}
                  onChange={(e) => setGrupoSelecionado(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">— Sem grupo —</option>
                  {grupos.filter(g => g.ativo).map(grupo => (
                    <option key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </option>
                  ))}
                  <option value={NOVO_GRUPO}>+ Criar novo grupo...</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Funcionários do grupo passam a ver esta loja automaticamente
                </p>
              </div>

              {grupoSelecionado === NOVO_GRUPO && (
                <div className="space-y-2">
                  <Label htmlFor="novoGrupoNome">Nome do novo grupo *</Label>
                  <Input
                    id="novoGrupoNome"
                    value={novoGrupoNome}
                    onChange={(e) => setNovoGrupoNome(e.target.value)}
                    placeholder="Ex: Grupo Sul de Minas"
                  />
                </div>
              )}

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
