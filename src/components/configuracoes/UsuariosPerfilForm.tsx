import { useState, useEffect } from "react";
import { Users, UserPlus, Shield, Eye, EyeOff, RotateCcw, Save, Copy, Trash2, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useSupabasePessoas } from "@/modules/rh/hooks/useSupabasePessoas";
import { useSupabaseUserProfiles } from "@/modules/rh/hooks/useSupabaseUserProfiles";
import { CriarUsuarioModal } from "@/modules/rh/components/CriarUsuarioModal";
import type { Usuario, Perfil, PermissoesPerfil, AppConfig, LogAuditoria } from "@/types";
import type { Pessoa } from "@/modules/rh/types";
import { useSupabaseUserRoles, AppRole } from "@/modules/rh/hooks/useSupabaseUserRoles";
import { useSupabaseUserLojas } from "@/modules/rh/hooks/useSupabaseUserLojas";
import { useSupabaseLojas } from "@/modules/rh/hooks/useSupabaseLojas";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";

// Storage functions
const STORAGE_KEY = 'erp-config';

function getAppConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      return {
        organizacao: config.organizacao || {},
        seguranca: config.seguranca || {},
        usuarios: config.usuarios || [],
        perfis: config.perfis || {},
        lojas: config.lojas || [],
        logsAuditoria: config.logsAuditoria || []
      } as AppConfig;
    }
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
  }
  return {
    organizacao: {} as any,
    seguranca: {} as any,
    usuarios: [],
    perfis: {},
    lojas: [],
    logsAuditoria: []
  };
}

function setAppConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
  }
}

// Session simulation
function getSimulatedProfile(): string | null {
  return localStorage.getItem('simulandoPerfilId');
}

function setSimulatedProfile(perfilId: string | null): void {
  if (perfilId) {
    localStorage.setItem('simulandoPerfilId', perfilId);
  } else {
    localStorage.removeItem('simulandoPerfilId');
  }
}

const dominios = [
  { key: 'clientes', label: 'Clientes' },
  { key: 'equipamentos', label: 'Equipamentos' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'inadimplencia', label: 'Inadimplência' },
  { key: 'manutencaoOS', label: 'Manutenção/OS' },
  { key: 'logistica', label: 'Logística' },
  { key: 'caixa', label: 'Caixa' },
  { key: 'configuracoes', label: 'Configurações' }
];

const acoes = [
  { key: 'ver', label: 'Ver', applies: ['clientes', 'equipamentos', 'contratos', 'financeiro', 'inadimplencia', 'manutencaoOS', 'logistica', 'caixa'] },
  { key: 'criar', label: 'Criar', applies: ['clientes', 'equipamentos', 'contratos', 'financeiro', 'inadimplencia', 'manutencaoOS', 'logistica'] },
  { key: 'editar', label: 'Editar', applies: ['clientes', 'equipamentos', 'contratos', 'financeiro', 'inadimplencia', 'manutencaoOS', 'logistica'] },
  { key: 'excluir', label: 'Excluir', applies: ['clientes', 'equipamentos', 'contratos', 'financeiro', 'inadimplencia', 'manutencaoOS', 'logistica'] },
  { key: 'renovar', label: 'Renovar', applies: ['contratos'] },
  { key: 'devolverSubstituir', label: 'Devolver/Substituir', applies: ['contratos'] },
  { key: 'emitirFatura', label: 'Emitir Fatura', applies: ['financeiro'] },
  { key: 'receberPagamento', label: 'Receber', applies: ['financeiro'] },
  { key: 'enviarMensagens', label: 'Enviar Mensagens', applies: ['inadimplencia'] },
  { key: 'gerirCaixa', label: 'Gerir Caixa', applies: ['caixa'] },
  { key: 'gerirConfiguracoes', label: 'Gerir Config.', applies: ['configuracoes'] }
];

export function UsuariosPerfilForm() {
  const [config, setConfig] = useState<AppConfig>(getAppConfig());
  const [selectedPerfilId, setSelectedPerfilId] = useState<string>('admin');
  const [simulatedProfile, setSimulatedProfileState] = useState<string | null>(getSimulatedProfile());
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [newUser, setNewUser] = useState<{
    nome: string;
    email: string;
    perfilId: string;
    status: 'Ativo' | 'Inativo';
    lojasPermitidas: string[];
  }>({
    nome: '',
    email: '',
    perfilId: '',
    status: 'Ativo',
    lojasPermitidas: []
  });

  // Hooks Supabase
  const { pessoas, isLoading: loadingPessoas } = useSupabasePessoas();
  const { profiles, isLoading: loadingProfiles } = useSupabaseUserProfiles();
  const [showCriarAcessoModal, setShowCriarAcessoModal] = useState(false);
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Pessoa | null>(null);

  // Estado para edição de acesso
  const [showEditarAcessoDrawer, setShowEditarAcessoDrawer] = useState(false);
  const [usuarioEditandoAcesso, setUsuarioEditandoAcesso] = useState<any | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editSelectedRoles, setEditSelectedRoles] = useState<AppRole[]>([]);
  const [editSelectedLojas, setEditSelectedLojas] = useState<string[]>([]);
  const [editLojaPadrao, setEditLojaPadrao] = useState<string>('');
  const [editTwoFaEnabled, setEditTwoFaEnabled] = useState(false);
  const [editExigeTrocaSenha, setEditExigeTrocaSenha] = useState(false);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  // Hooks Supabase adicionais
  const { updateRoles } = useSupabaseUserRoles();
  const { updateLojas: updateLojasPermitidas } = useSupabaseUserLojas();
  const { lojas } = useSupabaseLojas();
  const { updateProfile } = useSupabaseUserProfiles();

  // Filtrar colaboradores ativos sem acesso ao sistema
  const colaboradoresAtivos = pessoas.filter(p => p.situacao === 'ativo');
  const colaboradoresSemAcesso = colaboradoresAtivos.filter(
    pessoa => !profiles.some((profile: any) => profile.pessoa_id === pessoa.id)
  );

  const handleCriarAcesso = (pessoa: Pessoa) => {
    setPessoaSelecionada(pessoa);
    setShowCriarAcessoModal(true);
  };

  const handleEditarAcesso = async (profile: any) => {
    setUsuarioEditandoAcesso(profile);
    setEditUsername(profile.username || '');
    setEditLojaPadrao(profile.loja_padrao_id || '');
    setEditTwoFaEnabled(profile.two_fa_enabled || false);
    setEditExigeTrocaSenha(profile.exige_troca_senha || false);

    // Buscar roles e lojas do usuário
    try {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id);

      const { data: lojasData } = await supabase
        .from('user_lojas_permitidas')
        .select('loja_id')
        .eq('user_id', profile.id);

      setEditSelectedRoles(rolesData?.map(r => r.role as AppRole) || []);
      setEditSelectedLojas(lojasData?.map(l => l.loja_id) || []);
    } catch (error) {
      console.error('Erro ao buscar roles e lojas:', error);
      setEditSelectedRoles([]);
      setEditSelectedLojas([]);
    }

    setShowEditarAcessoDrawer(true);
  };

  const handleToggleEditRole = (role: AppRole) => {
    setEditSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleToggleEditLoja = (lojaId: string) => {
    setEditSelectedLojas(prev =>
      prev.includes(lojaId)
        ? prev.filter(id => id !== lojaId)
        : [...prev, lojaId]
    );
  };

  const handleSaveAcesso = async () => {
    if (!usuarioEditandoAcesso) return;

    if (editSelectedRoles.length === 0) {
      toast.error('Selecione ao menos um perfil de acesso.');
      return;
    }

    if (editSelectedLojas.length === 0) {
      toast.error('Selecione ao menos uma loja permitida.');
      return;
    }

    if (editLojaPadrao && !editSelectedLojas.includes(editLojaPadrao)) {
      toast.error('A loja padrão deve estar entre as lojas permitidas.');
      return;
    }

    setIsSavingAccess(true);
    try {
      // 1. Atualizar lojas permitidas primeiro (sem problema de recursão)
      await updateLojasPermitidas.mutateAsync({
        userId: usuarioEditandoAcesso.id,
        lojaIds: editSelectedLojas,
      });

      // 2. Atualizar roles (DELETE + INSERT)
      await updateRoles.mutateAsync({
        userId: usuarioEditandoAcesso.id,
        roles: editSelectedRoles,
      });

      // 3. Atualizar perfil por último
      await updateProfile.mutateAsync({
        id: usuarioEditandoAcesso.id,
        updates: {
          username: editUsername,
          loja_padrao_id: editLojaPadrao || null,
          two_fa_enabled: editTwoFaEnabled,
          exige_troca_senha: editExigeTrocaSenha,
        },
      });

      toast.success('Acesso atualizado com sucesso!');
      setShowEditarAcessoDrawer(false);
    } catch (error) {
      console.error('Erro ao salvar acesso:', error);
      toast.error('Falha ao atualizar acesso. Tente novamente.');
    } finally {
      setIsSavingAccess(false);
    }
  };

  const ROLES_DISPONIVEIS: { value: AppRole; label: string; description: string; color: string }[] = [
    { value: 'admin' as AppRole, label: 'Admin', description: 'Acesso total ao sistema', color: 'bg-red-500' },
    { value: 'gerente' as AppRole, label: 'Gerente', description: 'Visão ampla e relatórios multi-loja', color: 'bg-purple-500' },
    { value: 'rh' as AppRole, label: 'RH', description: 'Gestão de pessoas e benefícios', color: 'bg-blue-500' },
    { value: 'financeiro' as AppRole, label: 'Financeiro', description: 'CR/CP completos, relatórios', color: 'bg-green-500' },
    { value: 'vendedor' as AppRole, label: 'Vendedor', description: 'Contratos, logística, CR básico', color: 'bg-yellow-500' },
    { value: 'operacao' as AppRole, label: 'Operação', description: 'Logística e manutenção', color: 'bg-orange-500' },
    { value: 'motorista' as AppRole, label: 'Motorista', description: 'Logística do dia', color: 'bg-indigo-500' },
    { value: 'mecanico' as AppRole, label: 'Mecânico', description: 'Manutenção de equipamentos', color: 'bg-gray-500' },
    { value: 'user' as AppRole, label: 'Usuário', description: 'Acesso básico de consulta', color: 'bg-slate-500' },
  ];

  useEffect(() => {
    setConfig(getAppConfig());
  }, []);

  const handleSaveConfig = () => {
    setAppConfig(config);

    // Log auditoria
    const log: LogAuditoria = {
      id: Date.now().toString(),
      ts: Date.now(),
      usuario: "Admin Sistema",
      tipo: 'PERMISSAO_ATUALIZADA',
      meta: {
        perfil: selectedPerfilId,
        diffResumido: `Perfil ${config.perfis[selectedPerfilId]?.nome} atualizado`
      }
    };

    const updatedConfig = {
      ...config,
      logsAuditoria: [...config.logsAuditoria, log]
    };

    setConfig(updatedConfig);
    setAppConfig(updatedConfig);
    toast.success("Configurações salvas com sucesso!");
  };

  const handleUpdatePermission = (dominio: string, acao: string, value: boolean) => {
    if (!config.perfis[selectedPerfilId]) return;

    const updatedConfig = { ...config };
    const perfil = updatedConfig.perfis[selectedPerfilId];

    if (!perfil.permissoes[dominio as keyof PermissoesPerfil]) {
      return;
    }

    (perfil.permissoes[dominio as keyof PermissoesPerfil] as any)[acao] = value;
    setConfig(updatedConfig);
  };

  const handleSimulateProfile = (perfilId: string) => {
    setSimulatedProfile(perfilId);
    setSimulatedProfileState(perfilId);
    toast.success(`Simulando perfil: ${config.perfis[perfilId]?.nome}`);
  };

  const handleExitSimulation = () => {
    setSimulatedProfile(null);
    setSimulatedProfileState(null);
    toast.info("Simulação encerrada");
  };

  const handleSaveUser = () => {
    if (!newUser.nome || !newUser.email || !newUser.perfilId || !newUser.lojasPermitidas.length) {
      toast.error("Preencha todos os campos obrigatórios e selecione ao menos uma loja");
      return;
    }

    const updatedConfig = { ...config };

    if (editingUser) {
      const userIndex = updatedConfig.usuarios.findIndex(u => u.id === editingUser.id);
      if (userIndex >= 0) {
        updatedConfig.usuarios[userIndex] = {
          ...editingUser,
          ...newUser,
          lojasPermitidas: newUser.lojasPermitidas
        };
      }
    } else {
      const novoUsuario: Usuario = {
        id: Date.now().toString(),
        ...newUser,
        ultimoAcesso: new Date().toISOString(),
        lojasPermitidas: newUser.lojasPermitidas
      };
      updatedConfig.usuarios.push(novoUsuario);
    }

    setConfig(updatedConfig);
    setAppConfig(updatedConfig);
    setShowUserModal(false);
    setEditingUser(null);
    setNewUser({
      nome: '',
      email: '',
      perfilId: '',
      status: 'Ativo',
      lojasPermitidas: []
    });
    toast.success(editingUser ? "Usuário atualizado!" : "Usuário criado!");
  };

  const selectedPerfil = config.perfis[selectedPerfilId];

  return (
    <div className="space-y-6">
      {/* Badge de simulação */}
      {simulatedProfile && (
        <Alert className="border-orange-200 bg-orange-50">
          <Shield className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <span>Simulando perfil: <strong>{config.perfis[simulatedProfile]?.nome}</strong></span>
            <Button variant="outline" size="sm" onClick={handleExitSimulation}>
              Sair da Simulação
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Colaboradores sem Acesso */}
        {colaboradoresSemAcesso.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-600" />
                Colaboradores sem Acesso ao Sistema
              </CardTitle>
              <CardDescription>
                {colaboradoresSemAcesso.length} {colaboradoresSemAcesso.length === 1 ? 'pessoa ativa aguardando' : 'pessoas ativas aguardando'} provisionamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPessoas ? (
                <p className="text-center text-muted-foreground py-4">Carregando...</p>
              ) : (
                <div className="space-y-2">
                  {colaboradoresSemAcesso.map(pessoa => (
                    <div key={pessoa.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                      <div>
                        <p className="font-medium">{pessoa.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {pessoa.cargo || 'Sem cargo'} • CPF: {pessoa.cpf}
                        </p>
                      </div>
                      <Button onClick={() => handleCriarAcesso(pessoa)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Criar Acesso
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna A: Usuários */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Usuários do Sistema
              </CardTitle>
              <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Convidar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingUser ? 'Editar Usuário' : 'Convidar Usuário'}</DialogTitle>
                    <DialogDescription>
                      Preencha os dados do usuário abaixo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome</Label>
                      <Input
                        id="nome"
                        value={newUser.nome}
                        onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail/Login</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="usuario@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="perfil">Perfil</Label>
                      <Select value={newUser.perfilId} onValueChange={(value) => setNewUser({ ...newUser, perfilId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(config.perfis).map((perfil) => (
                            <SelectItem key={perfil.id} value={perfil.id}>
                              {perfil.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Lojas Permitidas *</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                        {lojas?.map((loja) => (
                          <div key={loja.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`loja-${loja.id}`}
                              checked={newUser.lojasPermitidas?.includes(loja.id) || false}
                              onChange={(e) => {
                                const lojasAtuais = newUser.lojasPermitidas || [];
                                if (e.target.checked) {
                                  setNewUser({
                                    ...newUser,
                                    lojasPermitidas: [...lojasAtuais, loja.id]
                                  });
                                } else {
                                  setNewUser({
                                    ...newUser,
                                    lojasPermitidas: lojasAtuais.filter(id => id !== loja.id)
                                  });
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor={`loja-${loja.id}`} className="text-sm">
                              {loja.nome} ({loja.codigo})
                            </label>
                          </div>
                        ))}
                        {!lojas?.length && (
                          <p className="text-sm text-muted-foreground col-span-2">
                            Nenhuma loja encontrada
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ativo"
                        checked={newUser.status === 'Ativo'}
                        onCheckedChange={(checked) => setNewUser({ ...newUser, status: checked ? 'Ativo' : 'Inativo' })}
                      />
                      <Label htmlFor="ativo">Usuário ativo</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowUserModal(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveUser} disabled={!newUser.nome || !newUser.email || !newUser.perfilId || !newUser.lojasPermitidas.length}>
                      {editingUser ? 'Salvar' : 'Convidar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingProfiles ? (
                <p className="text-center text-muted-foreground py-4">Carregando...</p>
              ) : (
                <div className="space-y-3">
                  {/* Usuários do Supabase */}
                  {profiles.map((profile: any) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-semibold text-primary">
                            {profile.pessoas?.nome?.substring(0, 2).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{profile.pessoas?.nome || profile.username || 'Sem nome'}</p>
                            {profile.pessoa_id && (
                              <Badge variant="outline" className="text-xs">
                                Vinculado ao RH
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{profile.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditarAcesso(profile)}
                        >
                          <Settings2 className="w-4 h-4 mr-2" />
                          Editar Acesso
                        </Button>
                        <Badge variant={profile.ativo ? "default" : "secondary"}>
                          {profile.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {/* Usuários do localStorage (legado) */}
                  {config.usuarios.map((usuario) => (
                    <div key={usuario.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{usuario.nome}</div>
                        <div className="text-sm text-muted-foreground">{usuario.email}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {config.perfis[usuario.perfilId]?.nome || usuario.perfilId}
                          </Badge>
                          <Badge variant={usuario.status === 'Ativo' ? 'default' : 'destructive'} className="text-xs">
                            {usuario.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Lojas: {usuario.lojasPermitidas?.map(lojaId => {
                            const loja = lojas?.find(l => l.id === lojaId);
                            // Only show if found in real stores list
                            if (!loja) return null;
                            return `${loja.nome} (${loja.codigo})`;
                          }).filter(Boolean).join(', ') || 'Nenhuma'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSimulateProfile(usuario.perfilId)}
                          title="Simular como este perfil"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingUser(usuario);
                            setNewUser({
                              nome: usuario.nome,
                              email: usuario.email,
                              perfilId: usuario.perfilId,
                              status: usuario.status,
                              lojasPermitidas: usuario.lojasPermitidas || []
                            });
                            setShowUserModal(true);
                          }}
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coluna B: Perfis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Perfis & Permissões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(config.perfis).map((perfil) => (
                    <Button
                      key={perfil.id}
                      variant={selectedPerfilId === perfil.id ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => setSelectedPerfilId(perfil.id)}
                    >
                      {perfil.nome}
                      {perfil.bloqueado && <span className="ml-1 text-xs">🔒</span>}
                    </Button>
                  ))}
                </div>

                {selectedPerfil && (
                  <div className="space-y-4">
                    <Separator />
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Matriz de Permissões - {selectedPerfil.nome}</h4>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleSaveConfig}>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSimulateProfile(selectedPerfil.id)}
                          title="Simular este perfil"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-medium">Domínio</th>
                            {acoes.map((acao) => (
                              <th key={acao.key} className="text-center p-2 font-medium min-w-[80px]">
                                {acao.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dominios.map((dominio) => (
                            <tr key={dominio.key} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-medium">{dominio.label}</td>
                              {acoes.map((acao) => {
                                const applies = acao.applies.includes(dominio.key);
                                const permission = selectedPerfil.permissoes[dominio.key as keyof PermissoesPerfil];
                                const value = applies && permission ? (permission as any)[acao.key] : false;

                                return (
                                  <td key={acao.key} className="text-center p-2">
                                    {applies ? (
                                      <Switch
                                        checked={value}
                                        onCheckedChange={(checked) => handleUpdatePermission(dominio.key, acao.key, checked)}
                                        disabled={selectedPerfil.bloqueado}
                                      />
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Criar Acesso */}
      <CriarUsuarioModal
        open={showCriarAcessoModal}
        onOpenChange={setShowCriarAcessoModal}
        pessoa={pessoaSelecionada}
      />

      {/* Drawer de Edição de Acesso */}
      <Drawer open={showEditarAcessoDrawer} onOpenChange={setShowEditarAcessoDrawer}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Editar Acesso de Usuário
            </DrawerTitle>
            <DrawerDescription>
              {usuarioEditandoAcesso?.pessoas?.nome || usuarioEditandoAcesso?.username || 'Usuário'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-6 overflow-y-auto">
            {/* Informações do Usuário */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações do Usuário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-username">Nome de Usuário</Label>
                    <Input
                      id="edit-username"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="usuario.sistema"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="pt-2">
                      <Badge variant={usuarioEditandoAcesso?.ativo ? 'default' : 'secondary'}>
                        {usuarioEditandoAcesso?.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-two-fa"
                    checked={editTwoFaEnabled}
                    onCheckedChange={(checked) => setEditTwoFaEnabled(checked as boolean)}
                  />
                  <Label htmlFor="edit-two-fa">Autenticação de dois fatores (2FA)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-troca-senha"
                    checked={editExigeTrocaSenha}
                    onCheckedChange={(checked) => setEditExigeTrocaSenha(checked as boolean)}
                  />
                  <Label htmlFor="edit-troca-senha">Exigir troca de senha no próximo login</Label>
                </div>
              </CardContent>
            </Card>

            {/* Perfis de Acesso */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Perfis de Acesso
                </CardTitle>
                <CardDescription>
                  Selecione os perfis que definem as permissões do usuário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ROLES_DISPONIVEIS.map((role) => (
                    <div
                      key={role.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${editSelectedRoles.includes(role.value)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                      onClick={() => handleToggleEditRole(role.value)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={editSelectedRoles.includes(role.value)}
                          onCheckedChange={() => handleToggleEditRole(role.value)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{role.label}</p>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Lojas Permitidas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Lojas Permitidas
                </CardTitle>
                <CardDescription>
                  Selecione as lojas que o usuário pode acessar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lojas.map((loja) => (
                    <div
                      key={loja.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${editSelectedLojas.includes(loja.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                      onClick={() => handleToggleEditLoja(loja.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={editSelectedLojas.includes(loja.id)}
                          onCheckedChange={() => handleToggleEditLoja(loja.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{loja.nome}</p>
                          <p className="text-xs text-muted-foreground">Código: {loja.codigo}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div>
                  <Label htmlFor="edit-loja-padrao">Loja Padrão</Label>
                  <Select value={editLojaPadrao} onValueChange={setEditLojaPadrao}>
                    <SelectTrigger id="edit-loja-padrao">
                      <SelectValue placeholder="Selecione a loja padrão" />
                    </SelectTrigger>
                    <SelectContent>
                      {lojas
                        .filter((loja) => editSelectedLojas.includes(loja.id))
                        .map((loja) => (
                          <SelectItem key={loja.id} value={loja.id}>
                            {loja.nome} ({loja.codigo})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    A loja padrão é selecionada automaticamente ao fazer login
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <DrawerFooter>
            <Button variant="outline" onClick={() => setShowEditarAcessoDrawer(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAcesso} disabled={isSavingAccess}>
              <Save className="w-4 h-4 mr-2" />
              {isSavingAccess ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}