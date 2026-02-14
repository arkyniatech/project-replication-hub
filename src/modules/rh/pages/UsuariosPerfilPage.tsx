import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Search, 
  Download,
  Eye,
  Edit,
  Trash2,
  UserCog,
  Plus,
  Clock,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { useAcessosStore } from '../store/acessosStore';
import { useRhStore } from '../store/rhStore';
import { CriarUsuarioModal } from '../components/CriarUsuarioModal';
import { useSupabaseUserProfiles } from '../hooks/useSupabaseUserProfiles';
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

export function UsuariosPerfilPage() {
  const { usuarios, perfis, solicitacoes } = useAcessosStore();
  const { pessoas } = useRhStore();
  const { deleteUser } = useSupabaseUserProfiles();
  
  const [filtros, setFiltros] = useState({
    busca: '',
    status: 'all',
    perfil: 'all',
    loja: 'all'
  });
  
  const [showCriarModal, setShowCriarModal] = useState(false);
  const [pessoaSelecionada, setPessoaSelecionada] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const colaboradoresAtivos = pessoas.filter(p => p.situacao === 'ativo');
  const colaboradoresSemUsuario = colaboradoresAtivos.filter(p => 
    !usuarios.some(u => u.funcionarioId === p.id)
  );

  const usuariosFiltrados = usuarios.filter(usuario => {
    const pessoa = pessoas.find(p => p.id === usuario.funcionarioId);
    
    if (filtros.busca && !usuario.nome.toLowerCase().includes(filtros.busca.toLowerCase()) && 
        !usuario.email.toLowerCase().includes(filtros.busca.toLowerCase())) {
      return false;
    }
    
    if (filtros.status && filtros.status !== 'all' && usuario.status !== filtros.status) {
      return false;
    }
    
    if (filtros.perfil && filtros.perfil !== 'all' && !usuario.perfis.includes(filtros.perfil)) {
      return false;
    }
    
    if (filtros.loja && filtros.loja !== 'all' && !usuario.lojasPermitidas.includes(filtros.loja)) {
      return false;
    }
    
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Ativo</Badge>;
      case 'pendente':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'suspenso':
        return <Badge variant="destructive">Suspenso</Badge>;
      case 'revogado':
        return <Badge variant="outline" className="border-red-200 text-red-600">Revogado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCriarPorColaborador = (pessoa: any) => {
    setPessoaSelecionada(pessoa);
    setShowCriarModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser.mutateAsync({ 
        user_id: userToDelete.id,
        email: userToDelete.email 
      });
      
      toast.success('Usuário deletado com sucesso');
      setShowDeleteDialog(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error);
      toast.error(error.message || 'Erro ao deletar usuário');
    }
  };

  const handleExportCSV = () => {
    // Mock export
    const csv = usuariosFiltrados.map(u => {
      const pessoa = pessoas.find(p => p.id === u.funcionarioId);
      return [
        u.nome,
        u.email,
        u.username,
        u.status,
        u.perfis.join('; '),
        u.lojasPermitidas.join('; '),
        u.lojaPadrao,
        format(new Date(u.criadoEm), 'dd/MM/yyyy')
      ].join(';');
    }).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'usuarios.csv';
    link.click();
    
    toast.success('Relatório exportado com sucesso');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários & Perfis</h1>
          <p className="text-muted-foreground">
            Gestão de acessos e permissões do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="usuarios" className="space-y-6">
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="perfis" className="gap-2">
            <Shield className="h-4 w-4" />
            Perfis
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Clock className="h-4 w-4" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{colaboradoresAtivos.length}</p>
                    <p className="text-xs text-muted-foreground">Colaboradores Ativos</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{usuarios.length}</p>
                    <p className="text-xs text-muted-foreground">Usuários do Sistema</p>
                  </div>
                  <UserCog className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {colaboradoresAtivos.length > 0 
                        ? Math.round((usuarios.length / colaboradoresAtivos.length) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Cobertura de Acesso</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {usuarios.filter(u => u.status === 'ATIVO').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Usuários Ativos</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    value={filtros.busca}
                    onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                    className="w-full"
                  />
                </div>
                
                <Select value={filtros.status} onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="revogado">Revogado</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filtros.perfil} onValueChange={(value) => setFiltros(prev => ({ ...prev, perfil: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os perfis</SelectItem>
                    {perfis.map(perfil => (
                      <SelectItem key={perfil.id} value={perfil.id}>
                        {perfil.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filtros.loja} onValueChange={(value) => setFiltros(prev => ({ ...prev, loja: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Loja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as lojas</SelectItem>
                    <SelectItem value="loja-1">Loja Centro</SelectItem>
                    <SelectItem value="loja-2">Loja Norte</SelectItem>
                    <SelectItem value="loja-3">Loja Sul</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          {colaboradoresSemUsuario.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Criar Novos Usuários</CardTitle>
                <CardDescription>
                  Colaboradores ativos sem conta de acesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {colaboradoresSemUsuario.slice(0, 5).map(pessoa => (
                    <div key={pessoa.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{pessoa.nome}</p>
                        <p className="text-sm text-muted-foreground">{pessoa.cargo} - {pessoa.lojaId}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCriarPorColaborador(pessoa)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Criar Acesso
                      </Button>
                    </div>
                  ))}
                  
                  {colaboradoresSemUsuario.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      E mais {colaboradoresSemUsuario.length - 5} colaboradores...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Usuários */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {usuariosFiltrados.length} de {usuarios.length} usuários
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {usuariosFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Nenhum usuário encontrado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ajuste os filtros ou crie novos usuários
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Perfis</TableHead>
                      <TableHead>Lojas</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuariosFiltrados.map(usuario => {
                      const pessoa = pessoas.find(p => p.id === usuario.funcionarioId);
                      return (
                        <TableRow key={usuario.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{usuario.nome}</p>
                              <p className="text-sm text-muted-foreground">@{usuario.username}</p>
                            </div>
                          </TableCell>
                          <TableCell>{usuario.email}</TableCell>
                          <TableCell>{getStatusBadge(usuario.status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {usuario.perfis.slice(0, 2).map(perfilId => {
                                const perfil = perfis.find(p => p.id === perfilId);
                                return (
                                  <Badge key={perfilId} variant="outline" className="text-xs">
                                    {perfil?.nome}
                                  </Badge>
                                );
                              })}
                              {usuario.perfis.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{usuario.perfis.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {usuario.lojasPermitidas.slice(0, 2).map(lojaId => (
                                <Badge key={lojaId} variant="outline" className="text-xs">
                                  {lojaId}
                                  {lojaId === usuario.lojaPadrao && ' (P)'}
                                </Badge>
                              ))}
                              {usuario.lojasPermitidas.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{usuario.lojasPermitidas.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(usuario.criadoEm), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" asChild>
                                <a href={`/rh/pessoas/${pessoa?.id}?tab=acesso`}>
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setUserToDelete(usuario);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perfis" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Perfis de Acesso</CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Perfil
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {perfis.map(perfil => (
                  <Card key={perfil.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{perfil.descricao}</CardTitle>
                        {perfil.travado && (
                          <Badge variant="secondary" className="text-xs">Sistema</Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm">
                        {perfil.permissoes.length} permissões
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Usuários com este perfil:
                        </p>
                        <p className="text-2xl font-bold">
                          {usuarios.filter(u => u.perfis.includes(perfil.id)).length}
                        </p>
                        
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!perfil.travado && (
                            <>
                              <Button size="sm" variant="outline">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logs de Auditoria</CardTitle>
              <CardDescription>
                Histórico de ações relacionadas a usuários e perfis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Logs de Auditoria
                </p>
                <p className="text-sm text-muted-foreground">
                  Funcionalidade em desenvolvimento
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Criação */}
      {pessoaSelecionada && (
        <CriarUsuarioModal
          open={showCriarModal}
          onOpenChange={(open) => {
            setShowCriarModal(open);
            if (!open) setPessoaSelecionada(null);
          }}
          pessoa={pessoaSelecionada}
        />
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão de usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o usuário <strong>{userToDelete?.nome}</strong> ({userToDelete?.email})?
              <br /><br />
              Esta ação é <strong>irreversível</strong> e irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remover o usuário do sistema de autenticação</li>
                <li>Remover todos os perfis e permissões</li>
                <li>Remover o acesso a todas as lojas</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                'Deletar Usuário'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}